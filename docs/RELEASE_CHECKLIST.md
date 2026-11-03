# Release checklist

The repository contains application source, tests, safe database migrations and an environment template. Credentials, private screenshots, local verification logs and generated reports are excluded.

## Before deployment

- Set the existing Supabase URL, anonymous key and Gemini key using the variable names in `.env.example`.
- Configure the full server-only Supabase backend key to enable password-verified account deletion. Never publish credentials or put backend keys in `NEXT_PUBLIC_` variables.
- Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS origin.
- For an existing Phase 2 database, apply only the final-phase migrations in filename order. For a new project, apply every migration in order. Do not rerun initial creation against existing tables.
- Configure Supabase Site URL, callback allowlists, confirmation emails and production SMTP.
- Review Gemini quotas/processing terms, backup retention and the operator's public support/legal details.

## Verification

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Start the application before running the optional HTTP smoke tests. The optional live Gemini test requires an explicitly selected private local synthetic PDF via `GEMINI_TEST_BILL_PATH`, consumes provider quota and writes no account records. Bill documents are not included in the public repository. See the README for commands and calculation assumptions.

Check a fresh account, bill upload/manual review, private document access, provider tariff setup, appliance editing, saved scenarios, the assistant, targets, savings plans and report downloads. Verify account isolation using separate QA accounts. Use disposable accounts and explicit approval for destructive deletion checks.

Deploy when ready using the committed Vercel configuration. This checklist does not trigger a deployment.
