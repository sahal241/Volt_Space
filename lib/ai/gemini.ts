import 'server-only';
import { requestBillExtraction, ExtractionError } from './extract-core';
import { ApiError } from '@/lib/server/http';
export async function extractBill(bytes: Uint8Array, mime: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key)
    throw new ApiError(
      'AI analysis is not configured. You can still enter your bill manually.',
      503,
    );
  try {
    return await requestBillExtraction(bytes, mime, {
      apiKey: key,
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    });
  } catch (error) {
    if (error instanceof ExtractionError) throw new ApiError(error.message, error.status);
    throw error;
  }
}
