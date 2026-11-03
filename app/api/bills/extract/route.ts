import { z } from 'zod';
import { failure, okay, requireUser, readJson, dbError, ApiError } from '@/lib/server/http';
import { readOwnedUpload } from '@/lib/server/files';
import { extractBill } from '@/lib/ai/gemini';
import { extractionWarnings } from '@/lib/validation/bills';
export const runtime = 'nodejs';
export const maxDuration = 90;
export async function POST(request: Request) {
  try {
    const { client, user } = await requireUser(request);
    const values = z
      .object({ id: z.uuid(), path: z.string().max(500), consent: z.literal(true) })
      .parse(await readJson(request));
    if (!process.env.GEMINI_API_KEY)
      throw new ApiError('AI analysis is not configured. Enter your bill manually instead.', 503);
    const { data: allowed, error } = await client.rpc('claim_bill_extraction');
    dbError(error);
    if (!allowed)
      throw new ApiError(
        'Analysis limit reached (10 per hour / 30 per day). Manual entry is always available.',
        429,
      );
    const { bytes, mime } = await readOwnedUpload(client, user.id, values.id, values.path);
    const extracted = await extractBill(bytes, mime);
    return okay({ extracted, warnings: extractionWarnings(extracted) });
  } catch (error) {
    return failure(error);
  }
}
