import { failure, okay, requireUser, readJson, dbError } from '@/lib/server/http';
import { workspaceSettingsSchema } from '@/lib/validation/tariff';
import { loadWorkspace } from '@/lib/server/workspace';
export async function PUT(request: Request) {
  try {
    const { client, user } = await requireUser(request);
    const values = workspaceSettingsSchema.parse(await readJson(request));
    const { error } = await client.rpc('save_workspace_settings', {
      full_name_value: values.fullName,
      currency_value: values.currency,
      cycle_value: values.billingDays,
      tariff_value: { ...values.tariff, slabs: values.tariff.slabs.map((s) => ({ ...s })) },
    });
    dbError(error);
    return okay(await loadWorkspace(client, user.id));
  } catch (error) {
    return failure(error);
  }
}
