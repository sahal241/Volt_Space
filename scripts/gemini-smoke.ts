/** Opt-in live check. Never publishes or automatically selects a bill document. */
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { requestBillExtraction } from '../lib/ai/extract-core.ts';
const fixturePath = process.env.GEMINI_TEST_BILL_PATH;
if (!fixturePath) {
  console.log(
    'SKIP: set GEMINI_TEST_BILL_PATH to a private local synthetic PDF to run this opt-in Gemini check. No document was sent.',
  );
} else {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Set the server-only GEMINI_API_KEY before running this check.');
  const bytes = await readFile(fixturePath);
  if (
    !bytes.length ||
    bytes.length > 10 * 1024 * 1024 ||
    !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))
  )
    throw new Error('Choose a nonempty synthetic PDF no larger than 10 MB.');
  const extracted = await requestBillExtraction(bytes, 'application/pdf', {
    apiKey: key,
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  });
  assert.notEqual(
    extracted.units_consumed,
    null,
    'The synthetic fixture must contain readable consumption.',
  );
  assert.notEqual(
    extracted.bill_amount,
    null,
    'The synthetic fixture must contain a readable bill amount.',
  );
  console.log(
    'PASS: Gemini returned validated structured bill information from the explicitly selected local fixture. No database records were written.',
  );
}
