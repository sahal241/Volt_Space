import test from 'node:test';
import assert from 'node:assert/strict';
import { requestBillExtraction, ExtractionError } from '../lib/ai/extract-core.ts';
const empty = {
  consumer_name: null,
  consumer_number: null,
  meter_number: null,
  tariff_category: null,
  billing_start: null,
  billing_end: null,
  billing_month: null,
  due_date: null,
  previous_reading: null,
  current_reading: null,
  units_consumed: null,
  bill_amount: null,
  energy_charge: null,
  fixed_charge: null,
  tax: null,
  other_charge: null,
  confidence: 'low',
  warnings: ['Document is not readable.'],
};
const bytes = new TextEncoder().encode('%PDF-1.7 synthetic');
const envelope = (value: unknown, finishReason = 'STOP') =>
  Response.json({
    candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(value) }] } }],
  });
test('Gemini request sends structured output constraints and uses an API-key header, never a key URL', async () => {
  let called = false;
  const result = await requestBillExtraction(bytes, 'application/pdf', {
    apiKey: 'synthetic-key',
    model: 'gemini-3.5-flash-lite',
    fetcher: async (url, options) => {
      called = true;
      assert.equal(String(url).includes('synthetic-key'), false);
      assert.equal((options?.headers as Record<string, string>)['x-goog-api-key'], 'synthetic-key');
      const body = JSON.parse(String(options?.body));
      assert.equal(body.generationConfig.responseMimeType, 'application/json');
      assert.equal(body.contents[0].parts[1].inlineData.mimeType, 'application/pdf');
      assert.ok(body.generationConfig.responseJsonSchema);
      return envelope(empty);
    },
  });
  assert.equal(called, true);
  assert.equal(result.units_consumed, null);
});
test('blocked, malformed and truncated Gemini outputs always fall back without a usable bill', async () => {
  for (const response of [
    envelope(empty, 'MAX_TOKENS'),
    envelope({ ...empty, units_consumed: -10 }),
    Response.json({ promptFeedback: { blockReason: 'SAFETY' } }),
    new Response('bad-json'),
  ])
    await assert.rejects(
      () =>
        requestBillExtraction(bytes, 'application/pdf', {
          apiKey: 'test',
          model: 'gemini-3.5-flash-lite',
          fetcher: async () => response,
        }),
      (error) => error instanceof ExtractionError && error.status === 422,
    );
  await assert.rejects(
    () =>
      requestBillExtraction(bytes, 'application/pdf', {
        apiKey: 'test',
        model: 'gemini-3.5-flash-lite',
        fetcher: async () => new Response('', { status: 429 }),
      }),
    (error) => error instanceof ExtractionError && error.status === 429,
  );
});
