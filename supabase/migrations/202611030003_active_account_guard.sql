-- Supabase access tokens can outlive a deleted auth user until expiry.
-- Preserve existing owner policies and add a restrictive active-profile check for this bucket.
-- No tables, files or accounts are removed. Safe to rerun.
begin;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='electricity_bills_active_account') then
 create policy electricity_bills_active_account on storage.objects as restrictive for all to authenticated
 using (bucket_id <> 'electricity-bills' or exists(select 1 from public.profiles where id=(select auth.uid())))
 with check (bucket_id <> 'electricity-bills' or exists(select 1 from public.profiles where id=(select auth.uid())));
 end if;
end $$;
commit;
