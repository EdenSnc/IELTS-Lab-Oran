import { randomUUID } from 'node:crypto';

export function logSafeError(
  event: string,
  error: unknown,
  context: Record<string, string | number | boolean | null> = {},
) {
  console.error(event, {
    requestId: randomUUID(),
    code: error instanceof Error ? error.name : 'UNKNOWN',
    ...context,
  });
}
