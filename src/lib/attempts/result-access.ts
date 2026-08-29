export function resultAccessActive(endsAt: Date | null | undefined, now = new Date()) {
  return !endsAt || endsAt > now;
}
