export function normalizeE164Phone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '');
  let international: string;
  if (compact.startsWith('00')) {
    international = `+${compact.slice(2)}`;
  } else if (compact.startsWith('0')) {
    international = `+213${compact.slice(1)}`;
  } else {
    international = compact;
  }

  const dzTrunkMatch = /^\+2130([1-9]\d{8})$/.exec(international);
  if (dzTrunkMatch) {
    international = `+213${dzTrunkMatch[1]}`;
  }

  if (international.startsWith('+213')) {
    return /^\+213[1-9]\d{8}$/.test(international) ? international : null;
  }

  return /^\+[1-9]\d{7,14}$/.test(international) ? international : null;
}
