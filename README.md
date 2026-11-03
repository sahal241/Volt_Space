# VoltSpace AI

**Understand your power. Control your bill.**

A full-stack electricity intelligence application for Indian homes. Built on the original VoltScope architecture, with existing account, bill and tariff data preserved. Public demo: `/demo/dashboard`. Private workspace: `/dashboard`.

## What works

- Supabase email/password sign-up, confirmation, sign-in, logout and protected workspaces.
- Private PDF/JPEG/PNG bill uploads up to 10 MB, signature validation, consent-based Gemini extraction, editable verification, complete manual entry and bill history CRUD.
- Account-owned appliances, custom flat/progressive tariffs, forward and reverse bill estimation, comparisons and real-data Recharts dashboards.
- Energy digital twin combining billed energy, period-adjusted appliance estimates, a visible unexplained residual and calibrated category flows.
- Multi-appliance household scenarios, adjustable operating hours and replacement power, saved input/tariff snapshots, edit/rename/delete, comparisons, investment, annual savings, simple payback and first-year net ROI. The standalone appliance calculator remains available.
- A transparent personal efficiency score, three-month consumption/bill forecasting, daily-use anomaly detection, energy/bill targets and editable estimated carbon emissions.
- Data-driven recommendations and a persistent savings-plan checklist. Checking an action does not claim measured savings.
- Ask VoltSpace: Gemini explains a minimal calculated summary. All displayed quantities come from deterministic facts. Numerical model prose and unknown fact references are rejected; unavailable AI has a clear fallback.
- Monthly, bill-history, appliance and savings reports with real downloadable PDF, CSV and JSON files. Spreadsheet formula injection is neutralized in CSV.
- Onboarding, light/dark/system themes, responsive accessible navigation, data exports, privacy/terms, SEO/social metadata, and password-verified permanent account deletion.

## Stack

Next.js 16 App Router, React, strict TypeScript, Tailwind CSS 4, Supabase SSR/Auth/Postgres/Storage, Recharts, Lucide, Zod, React Hook Form, date-fns, decimal.js and pdf-lib. Native Node test runner; PGlite provides isolated PostgreSQL/RLS integration tests. npm is the package manager.

## Local setup

Use Node 22.18+ (Node 24 also supported).

```bash
npm install
cp .env.example .env.local  # Only for a fresh checkout. Never replace an existing .env.local.
npm run dev
```

Open the Local URL printed by Next.js, normally `http://localhost:3000`. Use the same host throughout authentication: `localhost` and `127.0.0.1` have separate cookie stores.

### Environment variables

Keep these existing names unchanged:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

Additional configuration:

```dotenv
# Optional; default model used by bill extraction and Ask VoltSpace.
GEMINI_MODEL=gemini-3.5-flash-lite
# Server-only. Required for permanent account deletion, not for ordinary records or AI.
SUPABASE_SERVICE_ROLE_KEY=
# Your HTTPS deployment origin; used for metadata, social URLs and sitemap.
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

`SUPABASE_SERVICE_ROLE_KEY` accepts the project's full backend Secret key or legacy service-role key. Use its Copy button in Supabase; copying masked screen text produces an invalid credential. Never put it in a `NEXT_PUBLIC_` variable, browser code, logs, screenshots or Git. The account deletion dialog performs a read-only readiness check and disables deletion when this credential is missing or invalid. Existing anonymous/browser credentials stay unchanged.

### Supabase database

For the **existing Phase 2 project**, apply only these new files, in order, using SQL Editor or your established migration process:

1. `supabase/migrations/202611030002_final_intelligence.sql`
2. `supabase/migrations/202611030003_active_account_guard.sql`
3. `supabase/migrations/202611030004_simulation_precision.sql`

Paste the **SQL contents**, not the filesystem path, into SQL Editor. All upgrades are transactional and rerunnable, preserve existing records, and reuse the existing `electricity-bills` bucket. They add scenario snapshots, `energy_preferences`, `savings_plans`, protected request counters, six-decimal scenario storage, and a restrictive storage policy that blocks sessions whose profile has been deleted.

For a **new Supabase project**, apply every migration in filename order, starting with `202611020001_initial_schema.sql`. Do not reapply initial table creation to an existing project. The profile trigger creates a profile when an auth user signs up. All ordinary queries use the caller's authenticated client and account filters; RLS is authoritative. The privileged admin client is isolated to account readiness/deletion.

Ensure Supabase Auth has:

- Email/password sign-in enabled.
- The deployment origin as Site URL and `/auth/callback` allowed as a redirect.
- Local callback URLs allowed for the host you use during development.
- Production SMTP and email confirmation configured for your deployment.

Set the electricity provider's actual tariff in Settings before saving household simulations. Unsaved example rates are clearly labeled. Never treat demo tariff rates as a universal Indian electricity-board tariff.

### Gemini

Create a key in [Google AI Studio](https://aistudio.google.com/apikey), enable Gemini API access/quota for its project, and set the server-only `GEMINI_API_KEY`. Choose a model supporting multimodal PDF/images and structured outputs. The optional model override must start with `gemini-`.

- Extraction: one consented document, 60-second provider timeout, 10 requests/account/hour and 30/day.
- Assistant: question and calculated facts only, 45-second provider timeout, 30 requests/account/hour and 100/day.
- Quotas are atomic database counters, not process-local memory. Provider quota, timeout, malformed JSON, incomplete output and validation failures are handled without automatic bill saving.
- No AI request changes records. Bills require human verification; assistant text cannot execute actions. Manual entry and deterministic tools work without Gemini.

Review [Google's Gemini terms](https://ai.google.dev/gemini-api/terms) for processing/retention applicable to your API account before enabling public document analysis.

## Calculation assumptions

Money uses decimal.js and half-up paise rounding; component fees and tax are rounded before total. kWh is retained to six decimal places where needed and normally displayed to two.

- Appliance energy = watts × quantity × hours/day × operating days / 1,000. Inventory costs allocate the tariff's variable cost proportionally; fixed fees are excluded from individual appliance costs. These are rated-power estimates, not smart-meter readings.
- The digital twin normalizes inventory from the configured default cycle to the union of covered bill days. Bills assigned to the same month are summed; overlapping dates are not double-counted. Where inventory exceeds billed use, a proportional calibration reconciles categories. Otherwise, unexplained consumption remains unchanged in scenarios.
- Household savings = tariff(baseline) − tariff(modified household). Slabs are progressive, reset per modeled billing cycle, and tax applies to energy + fixed + additional charges. No universal provider subsidy, arrears, fuel adjustment or demand-charge rule is assumed.
- A saved household scenario retains changed appliances, actual baseline, calibration, billing-window length and tariff. It survives subsequent inventory/tariff edits. Legacy standalone scenarios remain readable and are identified separately.
- Household cycle savings are normalized to a 30-day month for payback; annual savings use twelve standardized 30-day months. Payback requires a positive monthly saving and nonzero total investment. First-year ROI = (annual saving − investment) / investment. Financing, maintenance, inflation, degradation and discounting are excluded. Scenarios are alternatives; overlapping savings must not be summed.
- Forecasting needs three consecutive months, averages each period's daily use and projects over the next calendar months. The displayed low/high range comes from observed daily minima/maxima, not a statistical confidence interval. No weather or seasonality prediction is claimed.
- Anomalies require the selected month plus three prior consecutive months. A daily-use deviation greater than 25% from the prior median is flagged. This is not electrical fault diagnosis.
- The efficiency score needs consecutive bills and an inventory: trend contributes up to 50 points, period-adjusted inventory agreement 25 and an optional energy target 25. Available points are normalized to 100. Formulas are shown in the twin. This is a personal progress index, not an official building rating or comparison with other homes.
- Carbon = kWh × user-configured kg CO₂e/kWh. The initial 0.700 factor is illustrative, not an official national factor. Set the appropriate local/supplier factor; lifecycle emissions are excluded.
- PDFs use standard Latin fonts; CSV and JSON preserve original Unicode input. PDF monetary labels use INR for reliable rendering.

## Security and account deletion

Every private API verifies `auth.getUser()`. Mutations also validate same-host Origin, bound JSON size and Zod input. Files use immutable owner paths, signatures/MIME/size checks and 120-second signed links. Secrets never enter client bundles. User content is rendered as text. CSV formulas are escaped. Request counters cannot be edited by clients.

Deletion requires an active account, exact `DELETE` confirmation and a fresh email/password check against the same account identity. Only then are owned storage files removed and the auth user deleted; foreign-key cascades remove related records. Storage failure preserves the auth account and returns a clear error; if some files were already removed, retry is required. Five deletion attempts/hour and ten/day are allowed. MFA-enabled accounts require an MFA-verified administrator workflow; the route refuses password-only deletion for them.

Supabase access tokens can remain valid until expiration after deletion. The additional restrictive storage policy requires an existing owner profile, preventing stale deleted-account sessions from uploading new bill files. App APIs independently revalidate the auth user. See [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data).

## Commands and verification

```bash
npm run dev          # Development server
npm run lint         # ESLint
npm run typecheck    # TypeScript without emission
npm test             # Offline calculation, AI contract, workflow, RLS/migration tests
npm run build        # Production compilation and prerendering
npm start            # Serve the production build
npm run check        # lint + typecheck + tests + build
npm run test:smoke   # Read-only HTTP/auth/origin and built-client secret checks; server required
npm run test:gemini  # Opt-in live local-PDF test; uses provider quota, writes no account records
npm run report:preview # Generate an illustrative PDF under output/pdf
```

`SMOKE_BASE_URL` optionally chooses the server for `test:smoke`; default is `http://127.0.0.1:3000`. Offline tests make no Google calls. Bill PDFs are intentionally excluded from Git. To run the optional live check, set `GEMINI_TEST_BILL_PATH` locally to a synthetic PDF you own; without it, the check skips and sends nothing. PostgreSQL tests apply upgrades twice and verify preservation, owner isolation, active-account storage protection, tariff rollback and durable quota enforcement. Account deletion tests verify identity mismatch and storage failure without deleting a real user.

For release review, use the demo for full-history forecasts/score/scenario comparisons, then a real account to upload/review a bill, reload saved records, configure a tariff, save scenarios/targets/plans and download reports. Test cross-account access using two isolated QA accounts. Never delete an existing review account or its fixtures to test deletion without explicit approval.

## Project structure

```text
app/                    Landing, legal/SEO, auth, protected pages, demo and API routes
components/             Existing layout, forms, charts, bills, appliances, reports, intelligence
lib/calculations/       Decimal energy, tariff, period and comparison engines
lib/intelligence/       Twin, forecasting, score, targets, anomalies, deterministic facts
lib/ai/                 Structured Gemini extraction and guarded explanation contracts
lib/server/             Authenticated loading, request validation, file and deletion workflows
lib/supabase/           Typed clients, repositories, private file staging
lib/reports/            Shared report data, CSV protection and paginated PDF renderer
lib/validation/         Zod input, output and snapshot schemas
types/                  Domain and database interfaces
supabase/migrations/    Initial schema and safe incremental upgrades
scripts/                Live smoke checks and illustrative report generation
tests/                  Offline tests and synthetic bill fixture
docs/                   Release checklist and deployment notes
```

## Vercel deployment

1. Import this checkout as a Next.js project. Use Node 22.18+ or Node 24. The committed `vercel.json` uses `npm ci` and `npm run build` with explicit AI/deletion function durations.
2. Set the existing three environment variables in Vercel. Add the server-only deletion credential, your real `NEXT_PUBLIC_SITE_URL`, and optional Gemini model override. Scope secrets to environments you intend to enable, then redeploy after changing them.
3. Apply the safe migrations to the connected Supabase project and configure its Site URL/callback allowlist for the production domain.
4. Configure production SMTP, Gemini quota/billing as appropriate, provider tariff settings and backup/retention operations. The operator must provide its legal identity and support contact alongside the privacy/terms information before offering a public service.
5. Run the checks above, deploy, and repeat smoke/auth/upload/download checks against the HTTPS deployment. Vercel function-duration availability depends on your plan/configuration; see [Vercel duration configuration](https://vercel.com/docs/functions/configuring-functions/duration).

No deployment is performed automatically by this repository. Do not publish `.env.local`, service credentials, private bill files or personal QA data. The public demo and sample PDF contain illustrative data only.
