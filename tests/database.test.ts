import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const A = '11111111-1111-4111-8111-111111111111',
  B = '22222222-2222-4222-8222-222222222222';
test('incremental migration is rerunnable; PostgreSQL enforces owner isolation, tariff validation, and atomic quotas', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
 grant usage on schema public,auth,storage to anon,authenticated;
 grant select,insert,delete on storage.objects to authenticated;`);
    // PGlite includes gen_random_uuid in core; Supabase's pgcrypto extension is already installed.
    const initial = (
      await readFile(
        new URL('../supabase/migrations/202611020001_initial_schema.sql', import.meta.url),
        'utf8',
      )
    ).replace('create extension if not exists pgcrypto;', '');
    await db.exec(initial);
    await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)', [
      A,
      'synthetic-a@example.test',
      B,
      'synthetic-b@example.test',
    ]);
    await db.query(
      "insert into public.bills(user_id,billing_month,units_consumed,bill_amount) values($1,'2026-10-01',100,700)",
      [A],
    );
    const upgrade = await readFile(
      new URL('../supabase/migrations/202611030001_phase2_intelligence.sql', import.meta.url),
      'utf8',
    );
    await db.exec(upgrade);
    await db.exec(upgrade);
    const finalUpgrade = await readFile(
      new URL('../supabase/migrations/202611030002_final_intelligence.sql', import.meta.url),
      'utf8',
    );
    await db.exec(finalUpgrade);
    await db.exec(finalUpgrade);
    const accountGuard = await readFile(
      new URL('../supabase/migrations/202611030003_active_account_guard.sql', import.meta.url),
      'utf8',
    );
    await db.exec(accountGuard);
    await db.exec(accountGuard);
    const precisionUpgrade = await readFile(
      new URL('../supabase/migrations/202611030004_simulation_precision.sql', import.meta.url),
      'utf8',
    );
    await db.exec(precisionUpgrade);
    await db.exec(precisionUpgrade);

    assert.equal(
      (await db.query<{ count: number }>('select count(*)::int as count from public.bills')).rows[0]
        .count,
      1,
    );
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${B}',false);`,
    );
    assert.equal((await db.query('select * from public.bills')).rows.length, 0);
    await assert.rejects(
      db.query("insert into public.bills(user_id,billing_month) values($1,'2026-11-01')", [A]),
      /row-level security/,
    );
    await db.exec(`select set_config('request.jwt.claim.sub','${A}',false);`);
    await db.query('insert into public.energy_preferences(user_id,target_kwh) values($1,250)', [A]);
    await db.query(
      "insert into public.savings_plans(user_id,rule_id,title) values($1,'test','Test action')",
      [A],
    );
    await db.query(
      "insert into public.simulations(user_id,name,original_kwh,simulated_kwh,estimated_savings,details) values($1,'Precision QA',200.000001,150.123456,349.14,'{\"version\":1}'::jsonb)",
      [A],
    );
    assert.equal(
      (
        await db.query<{ value: string }>(
          "select simulated_kwh::text as value from public.simulations where name='Precision QA'",
        )
      ).rows[0].value,
      '150.123456',
    );
    await db.exec(`select set_config('request.jwt.claim.sub','${B}',false);`);
    assert.equal((await db.query('select * from public.simulations')).rows.length, 0);
    assert.equal(
      (
        await db.query<{ count: number }>(
          "with changed as (update public.simulations set name='Unauthorized' returning id) select count(*)::int as count from changed",
        )
      ).rows[0].count,
      0,
    );
    assert.equal(
      (
        await db.query<{ count: number }>(
          'with removed as (delete from public.simulations returning id) select count(*)::int as count from removed',
        )
      ).rows[0].count,
      0,
    );
    assert.equal((await db.query('select * from public.energy_preferences')).rows.length, 0);
    assert.equal((await db.query('select * from public.savings_plans')).rows.length, 0);
    await assert.rejects(
      db.query('insert into public.energy_preferences(user_id) values($1)', [A]),
      /row-level security/,
    );
    await assert.rejects(db.query('select * from public.ai_request_usage'), /permission denied/);
    await assert.rejects(
      db.query("select public.claim_ai_request('unsupported')"),
      /Invalid feature/,
    );
    for (let i = 0; i < 30; i++)
      assert.equal(
        (
          await db.query<{ claim_ai_request: boolean }>(
            "select public.claim_ai_request('assistant')",
          )
        ).rows[0].claim_ai_request,
        true,
      );
    assert.equal(
      (await db.query<{ claim_ai_request: boolean }>("select public.claim_ai_request('assistant')"))
        .rows[0].claim_ai_request,
      false,
    );
    await db.exec(`select set_config('request.jwt.claim.sub','${A}',false);`);
    await assert.rejects(
      db.query('update public.energy_preferences set user_id=$1', [B]),
      /row-level security/,
    );

    await assert.rejects(db.query('update public.bills set user_id=$1', [B]), /row-level security/);
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('electricity-bills',$1)", [
        `${B}/anything.pdf`,
      ]),
      /row-level security/,
    );
    await db.query("insert into storage.objects(bucket_id,name) values('electricity-bills',$1)", [
      `${A}/bill.pdf`,
    ]);
    await db.exec(
      `reset role;delete from public.profiles where id='${B}';set role authenticated;select set_config('request.jwt.claim.sub','${B}',false);`,
    );
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('electricity-bills',$1)", [
        `${B}/deleted-session.pdf`,
      ]),
      /row-level security/,
    );
    await db.exec(`select set_config('request.jwt.claim.sub','${A}',false);`);

    const tariff = {
      name: 'Test slabs',
      type: 'slab',
      rate_per_kwh: 0,
      fixed_charge: 100,
      tax_percentage: 5,
      additional_charge: 0,
      slabs: [
        { up_to: 50, rate: 0 },
        { up_to: null, rate: 7 },
      ],
    };
    await db.query('select public.save_workspace_settings($1,$2,$3,$4::jsonb)', [
      'Synthetic A',
      'INR',
      30,
      JSON.stringify(tariff),
    ]);
    await db.query('select public.save_workspace_settings($1,$2,$3,$4::jsonb)', [
      'Synthetic A edited',
      'INR',
      28,
      JSON.stringify(tariff),
    ]);
    assert.equal((await db.query('select * from public.tariffs where is_active')).rows.length, 1);
    await assert.rejects(
      db.query('select public.save_workspace_settings($1,$2,$3,$4::jsonb)', [
        'Must roll back',
        'INR',
        30,
        JSON.stringify({ ...tariff, slabs: [{ up_to: 50, rate: 7 }] }),
      ]),
      /constraint/,
    );
    assert.equal(
      (await db.query<{ full_name: string }>('select full_name from public.profiles')).rows[0]
        .full_name,
      'Synthetic A edited',
    );
    for (let i = 0; i < 10; i++)
      assert.equal(
        (await db.query<{ allowed: boolean }>('select public.claim_bill_extraction() as allowed'))
          .rows[0].allowed,
        true,
      );
    assert.equal(
      (await db.query<{ allowed: boolean }>('select public.claim_bill_extraction() as allowed'))
        .rows[0].allowed,
      false,
    );
    await assert.rejects(db.query('delete from public.bill_extraction_usage'), /permission denied/);
    // Changing the session timezone cannot reset a daily quota.
    await db.exec(
      "reset role;update public.bill_extraction_usage set hour_start=now()-interval '2 hours',day_count=30;set role authenticated;set timezone='Pacific/Kiritimati';",
    );
    assert.equal(
      (await db.query<{ allowed: boolean }>('select public.claim_bill_extraction() as allowed'))
        .rows[0].allowed,
      false,
    );
    await db.exec(`select set_config('request.jwt.claim.sub','${B}',false);`);
    assert.equal((await db.query('select * from public.tariffs')).rows.length, 0);
    assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
    assert.equal((await db.query('select * from public.profiles')).rows.length, 0); // B's profile was removed for the stale-session check.
    await db.exec('reset role;set role anon;');
    await assert.rejects(db.query('select * from public.bills'), /permission denied/);
  } finally {
    await db.close();
  }
});
