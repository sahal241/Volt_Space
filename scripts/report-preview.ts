/** Generate an illustrative PDF for portfolio review. Never reads account records. */
import { mkdir, writeFile } from 'node:fs/promises';
import { demoBills, demoAppliances } from '../lib/demo.ts';
import { defaultTariff } from '../lib/calculations/tariff.ts';
import { defaultPreferences } from '../lib/intelligence/types.ts';
import { buildReport } from '../lib/reports/model.ts';
import { createReportPdf } from '../lib/reports/pdf.ts';
import type { WorkspaceData } from '../types/index.ts';
const tariff = { ...defaultTariff, rate_per_kwh: 6.2, fixed_charge: 100 };
const workspace: WorkspaceData = {
  profile: null,
  bills: demoBills,
  appliances: demoAppliances,
  tariffs: [],
  simulations: [],
  preferences: {
    ...defaultPreferences,
    target_kwh: 260,
    target_bill: 2000,
    onboarding_completed: true,
  },
  plans: [],
  settings: {
    fullName: 'Demo household',
    currency: 'INR',
    rate: 6.2,
    fixedCharge: 100,
    billingDays: 30,
    tariff,
  },
};
await mkdir('output/pdf', { recursive: true });
await writeFile(
  'output/pdf/voltspace-demo-energy-report.pdf',
  await createReportPdf(buildReport(workspace, 'monthly', '2026-11', true)),
);
console.log('Created output/pdf/voltspace-demo-energy-report.pdf using illustrative data only.');
