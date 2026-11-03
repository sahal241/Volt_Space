import { z } from 'zod';
import { requireUser, readJson, failure } from '@/lib/server/http';
import { loadWorkspace } from '@/lib/server/workspace';
import { monthSchema } from '@/lib/validation/intelligence';
import { buildReport, reportCsv } from '@/lib/reports/model';
import { createReportPdf } from '@/lib/reports/pdf';
export const runtime = 'nodejs';
const schema = z.strictObject({
  kind: z.enum(['monthly', 'bills', 'appliances', 'savings']),
  month: monthSchema,
  format: z.enum(['pdf', 'csv', 'json']),
});
export async function POST(request: Request) {
  try {
    const { client, user } = await requireUser(request),
      v = schema.parse(await readJson(request)),
      w = await loadWorkspace(client, user.id),
      report = buildReport(w, v.kind, v.month);
    const body =
      v.format === 'pdf'
        ? new Uint8Array(await createReportPdf(report))
        : v.format === 'csv'
          ? reportCsv(report)
          : JSON.stringify(
              {
                report,
                data: {
                  bills: w.bills,
                  appliances: w.appliances,
                  simulations: w.simulations,
                  tariff: w.settings.tariff,
                  preferences: w.preferences,
                  plans: w.plans,
                },
              },
              null,
              2,
            );
    return new Response(body, {
      headers: {
        'Content-Type':
          v.format === 'pdf'
            ? 'application/pdf'
            : v.format === 'csv'
              ? 'text/csv; charset=utf-8'
              : 'application/json',
        'Content-Disposition': `attachment; filename="voltspace-${v.kind}-${v.month}.${v.format}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
