-- VoltScope AI, Phase 1. Run once in Supabase SQL Editor or with supabase db push.
begin;
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '' check (char_length(full_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  billing_month date not null check (extract(day from billing_month) = 1),
  billing_start date,
  billing_end date,
  -- Null means not yet extracted; zero is a legitimate reading.
  units_consumed numeric(12,3) check (units_consumed >= 0 and units_consumed < 100000000),
  bill_amount numeric(12,2) check (bill_amount >= 0 and bill_amount < 100000000),
  fixed_charge numeric(12,2) not null default 0 check (fixed_charge >= 0 and fixed_charge < 100000000),
  energy_charge numeric(12,2) not null default 0 check (energy_charge >= 0 and energy_charge < 100000000),
  tax numeric(12,2) not null default 0 check (tax >= 0 and tax < 100000000),
  other_charge numeric(12,2) not null default 0 check (other_charge >= 0 and other_charge < 100000000),
  -- Historical column name; value is the private storage object PATH, never a public/signed URL.
  file_url text check (file_url is null or file_url like user_id::text || '/%'),
  created_at timestamptz not null default now(),
  check (billing_start is null or billing_end is null or billing_end >= billing_start)
);
create table public.appliances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  category text not null check (category in ('Cooling','Kitchen','Lighting','Entertainment','Other')),
  power_watts numeric(10,2) not null check (power_watts > 0 and power_watts <= 50000),
  quantity integer not null default 1 check (quantity between 1 and 100),
  hours_per_day numeric(5,2) not null check (hours_per_day between 0 and 24),
  days_per_month integer not null default 30 check (days_per_month between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.tariffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Custom tariff' check (char_length(name) between 1 and 80),
  type text not null default 'custom' check (type = 'custom'),
  rate_per_kwh numeric(8,3) not null check (rate_per_kwh > 0 and rate_per_kwh <= 100),
  fixed_charge numeric(10,2) not null default 0 check (fixed_charge between 0 and 10000),
  created_at timestamptz not null default now()
);
create table public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  original_kwh numeric(12,3) not null check (original_kwh >= 0 and original_kwh < 100000000),
  simulated_kwh numeric(12,3) not null check (simulated_kwh >= 0 and simulated_kwh < 100000000),
  -- Signed: negative savings represent an increase in cost.
  estimated_savings numeric(12,2) not null check (abs(estimated_savings) < 100000000),
  created_at timestamptz not null default now()
);
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('trend','consumption','saving')),
  title text not null check (char_length(title) between 1 and 200),
  description text not null check (char_length(description) between 1 and 5000),
  estimated_savings numeric(12,2) not null default 0 check (estimated_savings >= 0 and estimated_savings < 100000000),
  created_at timestamptz not null default now()
);

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger appliances_updated before update on public.appliances for each row execute function public.touch_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name) values (new.id, coalesce(new.email, ''), left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80));
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- Backfill users created before this migration.
insert into public.profiles (id, email) select id, coalesce(email, '') from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- Profiles are created by the trusted auth trigger. Clients can update only full_name.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

do $$
declare target text;
begin
  foreach target in array array['bills','appliances','tariffs','simulations','insights'] loop
    execute format('alter table public.%I enable row level security', target);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', target || '_select_own', target);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', target || '_insert_own', target);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', target || '_update_own', target);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', target || '_delete_own', target);
    execute format('revoke all on public.%I from anon', target);
    execute format('grant select, insert, update, delete on public.%I to authenticated', target);
    execute format('create index %I on public.%I (user_id)', target || '_user_id_idx', target);
  end loop;
end;
$$;
create index bills_user_month_idx on public.bills (user_id, billing_month desc);

-- Private bill storage. Access is scoped to {auth.uid()}/{random-uuid}.{extension}.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('electricity-bills','electricity-bills',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy bills_files_select_own on storage.objects for select to authenticated using (bucket_id = 'electricity-bills' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy bills_files_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'electricity-bills' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy bills_files_delete_own on storage.objects for delete to authenticated using (bucket_id = 'electricity-bills' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Files are immutable; replace with a new object instead of granting update.
commit;
