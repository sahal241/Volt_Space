import { MAX_BILL_BYTES } from './schemas.ts';
export function inspectFile(bytes: Uint8Array, claimed: string) {
  if (bytes.length < 4 || bytes.length > MAX_BILL_BYTES)
    throw new Error('Choose a non-empty bill file up to 10 MB.');
  const pdf = new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const actual = pdf ? 'application/pdf' : png ? 'image/png' : jpeg ? 'image/jpeg' : null;
  if (!actual || actual !== claimed)
    throw new Error('File contents do not match a supported PDF, PNG or JPEG.');
  return actual;
}
export function ownedBillPath(path: string, userId: string, billId?: string) {
  const escaped = userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}/${billId ?? '[0-9a-f-]{36}'}/bill\\.(pdf|png|jpg)$`, 'i').test(
    path,
  );
}
