import { requireUser, readJson, okay, failure, dbError, ApiError } from '@/lib/server/http';
import { loadWorkspace } from '@/lib/server/workspace';
import { assistantInputSchema } from '@/lib/validation/intelligence';
import { energyFacts } from '@/lib/intelligence/facts';
import { requestEnergyAnswer } from '@/lib/ai/assistant-core';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { client, user } = await requireUser(request),
      values = assistantInputSchema.parse(await readJson(request, 8192));
    if (!process.env.GEMINI_API_KEY)
      throw new ApiError(
        'Gemini is not configured. Your calculated energy facts are still available below.',
        503,
      );
    const quota = await client.rpc('claim_ai_request', { feature_value: 'assistant' });
    dbError(quota.error);
    if (!quota.data)
      throw new ApiError(
        'Assistant limit reached. Try again later; your energy tools remain available.',
        429,
      );
    const w = await loadWorkspace(client, user.id),
      facts = energyFacts(w, values.month);
    try {
      return okay({
        ...(await requestEnergyAnswer(values.question, facts, {
          apiKey: process.env.GEMINI_API_KEY,
          model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
        })),
        source: 'gemini',
      });
    } catch {
      return okay({
        explanation:
          'The assistant could not produce a verified explanation. Your calculated facts are shown below. Use the digital twin or simulator to explore them.',
        fact_ids: facts.slice(0, 6).map((f) => f.id),
        facts: facts.slice(0, 6),
        action: 'twin',
        source: 'fallback',
      });
    }
  } catch (error) {
    return failure(error);
  }
}
