export function normalizeE164Phone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '');
  const international = compact.startsWith('0')
    ? `+213${compact.slice(1)}`
    : compact;
  return /^\+[1-9]\d{7,14}$/.test(international) ? international : null;
}
