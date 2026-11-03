-- Phase 2 upgrade ONLY. Existing Phase 1 tables, bucket and owner policies are reused.
-- Safe to rerun. Do not rerun the Phase 1 creation migration on an existing project.
begin;
alter table public.profiles add column if not exists currency text not null default 'INR';
alter table public.profiles add column if not exists billing_cycle_days integer not null default 30;
alter table public.profiles drop constraint if exists profiles_currency_check;
alter table public.profiles add constraint profiles_currency_check check (currency = 'INR');
alter table public.profiles drop constraint if exists profiles_cycle_check;
alter table public.profiles add constraint profiles_cycle_check check (billing_cycle_days between 1 and 31);
grant update (full_name, currency, billing_cycle_days) on public.profiles to authenticated;

alter table public.bills add column if not exists consumer_name text;
alter table public.bills add column if not exists consumer_number text;
alter table public.bills add column if not exists meter_number text;
alter table public.bills add column if not exists tariff_category text;
alter table public.bills add column if not exists previous_reading numeric(12,3);
alter table public.bills add column if not exists current_reading numeric(12,3);
alter table public.bills add column if not exists due_date date;
alter table public.bills add column if not exists extraction_status text not null default 'manual';
alter table public.bills add column if not exists verified boolean not null default true;
alter table public.bills drop constraint if exists bills_phase2_check;
alter table public.bills add constraint bills_phase2_check check (
 extraction_status in ('manual','extracted') and verified = true
 and (previous_reading is null or previous_reading between 0 and 99999999)
 and (current_reading is null or current_reading between 0 and 99999999)
 and coalesce(char_length(consumer_name),0)<=160 and coalesce(char_length(consumer_number),0)<=160
 and coalesce(char_length(meter_number),0)<=160 and coalesce(char_length(tariff_category),0)<=160
);

alter table public.appliances drop constraint if exists appliances_category_check;
alter table public.appliances add constraint appliances_category_check check (category in ('Cooling','Kitchen','Lighting','Entertainment','Laundry','Water Heating','Computing','Other'));
alter table public.tariffs drop constraint if exists tariffs_type_check;
alter table public.tariffs add constraint tariffs_type_check check (type in ('custom','flat','slab'));
alter table public.tariffs drop constraint if exists tariffs_rate_per_kwh_check;
alter table public.tariffs add constraint tariffs_rate_per_kwh_check check (rate_per_kwh between 0 and 100);
alter table public.tariffs add column if not exists slabs jsonb not null default '[]';
alter table public.tariffs add column if not exists tax_percentage numeric(6,3) not null default 0;
alter table public.tariffs add column if not exists additional_charge numeric(10,2) not null default 0;
alter table public.tariffs add column if not exists is_active boolean not null default false;
create unique index if not exists tariffs_one_active_per_user on public.tariffs(user_id) where is_active;

create or replace function public.valid_tariff_slabs(model text, bands jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; boundary numeric; previous numeric := 0; counter integer := 0; total integer;
begin
 if jsonb_typeof(bands) <> 'array' then return false; end if;
 if model <> 'slab' then return jsonb_array_length(bands) = 0; end if;
 total := jsonb_array_length(bands); if total < 1 or total > 20 then return false; end if;
 for item in select value from jsonb_array_elements(bands) loop
  counter := counter + 1;
  if jsonb_typeof(item->'rate') is distinct from 'number' or (item->>'rate')::numeric not between 0 and 100 then return false; end if;
  if item->'up_to' = 'null'::jsonb then if counter <> total then return false; end if;
  else
   if jsonb_typeof(item->'up_to') is distinct from 'number' then return false; end if;
   boundary := (item->>'up_to')::numeric;
   if boundary <= previous or boundary > 100000000 or counter = total then return false; end if;
   previous := boundary;
  end if;
 end loop;
 return true;
exception when others then return false;
end;
$$;
alter table public.tariffs drop constraint if exists tariffs_phase2_check;
alter table public.tariffs add constraint tariffs_phase2_check check (tax_percentage between 0 and 100 and additional_charge between 0 and 10000 and public.valid_tariff_slabs(type,slabs));

-- Keep the existing private bucket and policies. Only update validation limits.
update storage.buckets set public=false, file_size_limit=10485760, allowed_mime_types=array['application/pdf','image/jpeg','image/png'] where id='electricity-bills';

-- Tracks original files until human verification; never stores extracted bill fields.
create table if not exists public.bill_uploads (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 file_path text not null unique,
 mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
 byte_size integer not null check (byte_size between 1 and 10485760),
 created_at timestamptz not null default now(),
 check (file_path like user_id::text || '/' || id::text || '/%')
);
alter table public.bill_uploads enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='bill_uploads' and policyname='bill_uploads_own') then
 create policy bill_uploads_own on public.bill_uploads for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
 end if;
end $$;
revoke all on public.bill_uploads from public,anon,authenticated;
grant select,insert,delete on public.bill_uploads to authenticated;
create index if not exists bill_uploads_user_idx on public.bill_uploads(user_id,created_at);

-- Durable, atomic per-account API limits; clients cannot reset or edit counters.
create table if not exists public.bill_extraction_usage (
 user_id uuid primary key references auth.users(id) on delete cascade,
 hour_start timestamptz not null default now(), hour_count integer not null default 0,
 day_start date not null default current_date, day_count integer not null default 0
);
alter table public.bill_extraction_usage enable row level security;
revoke all on public.bill_extraction_usage from public,anon,authenticated;
create or replace function public.claim_bill_extraction() returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); usage public.bill_extraction_usage%rowtype; today date := (now() at time zone 'UTC')::date;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 insert into public.bill_extraction_usage(user_id) values(uid) on conflict do nothing;
 select * into usage from public.bill_extraction_usage where user_id=uid for update;
 if usage.hour_start <= now()-interval '1 hour' then usage.hour_start:=now(); usage.hour_count:=0; end if;
 if usage.day_start <> today then usage.day_start:=today; usage.day_count:=0; end if;
 if usage.hour_count>=10 or usage.day_count>=30 then return false; end if;
 update public.bill_extraction_usage set hour_start=usage.hour_start,hour_count=usage.hour_count+1,day_start=usage.day_start,day_count=usage.day_count+1 where user_id=uid;
 return true;
end;
$$;
revoke all on function public.claim_bill_extraction() from public,anon;
grant execute on function public.claim_bill_extraction() to authenticated;

-- Atomic profile + active tariff update, executing with the caller's RLS permissions.
create or replace function public.save_workspace_settings(full_name_value text, currency_value text, cycle_value integer, tariff_value jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Authentication required'; end if;
 update public.profiles set full_name=full_name_value,currency=currency_value,billing_cycle_days=cycle_value where id=uid;
 if not found then raise exception 'Profile missing; check the Phase 1 profile trigger'; end if;
 insert into public.tariffs(user_id,name,type,rate_per_kwh,fixed_charge,tax_percentage,additional_charge,slabs,is_active)
 values(uid,tariff_value->>'name',tariff_value->>'type',(tariff_value->>'rate_per_kwh')::numeric,(tariff_value->>'fixed_charge')::numeric,(tariff_value->>'tax_percentage')::numeric,(tariff_value->>'additional_charge')::numeric,tariff_value->'slabs',true)
 on conflict(user_id) where is_active do update set name=excluded.name,type=excluded.type,rate_per_kwh=excluded.rate_per_kwh,fixed_charge=excluded.fixed_charge,tax_percentage=excluded.tax_percentage,additional_charge=excluded.additional_charge,slabs=excluded.slabs;
end;
$$;
revoke all on function public.save_workspace_settings(text,text,integer,jsonb) from public,anon;
grant execute on function public.save_workspace_settings(text,text,integer,jsonb) to authenticated;
commit;
