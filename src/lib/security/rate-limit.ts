import 'server-only';

type Bucket = {
  timestamps: number[];
};

const MAX_BUCKETS = 4_096;
const buckets = new Map<string, Bucket>();

export function extractClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded.slice(0, 64);
  return 'unknown';
}

export function checkSlidingWindowRateLimit(input: {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): { allowed: boolean; retryAfterSeconds: number } {
  const now = input.now ?? Date.now();
  const cutoff = now - input.windowMs;
  const mapKey = `${input.namespace}:${input.key}`;
  const existing = buckets.get(mapKey);
  const recent = existing
    ? existing.timestamps.filter((ts) => ts > cutoff)
    : [];

  if (recent.length >= input.limit) {
    if (existing) existing.timestamps = recent;
    const oldest = recent[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + input.windowMs - now) / 1_000));
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  if (existing) {
    buckets.delete(mapKey);
  } else if (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey !== undefined) buckets.delete(oldestKey);
  }
  buckets.set(mapKey, { timestamps: recent });
  return { allowed: true, retryAfterSeconds: 0 };
}
