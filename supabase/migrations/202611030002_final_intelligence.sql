-- Additive final-phase upgrade. Apply after Phase 2. Safe to rerun; preserves records and storage.
begin;
alter table public.simulations add column if not exists details jsonb;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='simulations_details_size') then
 alter table public.simulations add constraint simulations_details_size check(details is null or (jsonb_typeof(details)='object' and octet_length(details::text)<=250000));
 end if;
end $$;
create table if not exists public.energy_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 target_kwh numeric(12,2) check(target_kwh between 0 and 100000),
 target_bill numeric(12,2) check(target_bill between 0 and 10000000),
 carbon_factor numeric(5,3) not null default 0.7 check(carbon_factor between 0 and 2),
 onboarding_completed boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.savings_plans (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 rule_id text not null check(length(rule_id) between 1 and 100),
 title text not null check(length(title) between 1 and 300),
 status text not null default 'planned' check(status in ('planned','completed')),
 created_at timestamptz not null default now(),
 unique(user_id,rule_id)
);
alter table public.energy_preferences enable row level security;
alter table public.savings_plans enable row level security;
do $$ declare t text; begin
 foreach t in array array['energy_preferences','savings_plans'] loop
 if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_own') then
 execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t||'_own',t);
 end if;
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
create index if not exists savings_plans_owner_idx on public.savings_plans(user_id,created_at);
create table if not exists public.ai_request_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 feature text not null check(feature in ('assistant','account_delete')),
 hour_start timestamptz not null default now(),hour_count integer not null default 0,
 day_start date not null default current_date,day_count integer not null default 0,
 primary key(user_id,feature)
);
alter table public.ai_request_usage enable row level security;
revoke all on public.ai_request_usage from public,anon,authenticated;
create or replace function public.claim_ai_request(feature_value text) returns boolean
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); usage public.ai_request_usage%rowtype; today date:=(now() at time zone 'UTC')::date;
 hour_limit integer;day_limit integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if feature_value='assistant' then hour_limit:=30;day_limit:=100;
 elsif feature_value='account_delete' then hour_limit:=5;day_limit:=10;
 else raise exception 'Invalid feature'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||feature_value,0));
 insert into public.ai_request_usage(user_id,feature) values(uid,feature_value) on conflict do nothing;
 select * into usage from public.ai_request_usage where user_id=uid and feature=feature_value for update;
 if usage.hour_start<=now()-interval '1 hour' then usage.hour_start:=now();usage.hour_count:=0;end if;
 if usage.day_start<>today then usage.day_start:=today;usage.day_count:=0;end if;
 if usage.hour_count>=hour_limit or usage.day_count>=day_limit then return false;end if;
 update public.ai_request_usage set hour_start=usage.hour_start,hour_count=usage.hour_count+1,day_start=usage.day_start,day_count=usage.day_count+1 where user_id=uid and feature=feature_value;
 return true;
end $$;
revoke all on function public.claim_ai_request(text) from public,anon;
grant execute on function public.claim_ai_request(text) to authenticated;
commit;
