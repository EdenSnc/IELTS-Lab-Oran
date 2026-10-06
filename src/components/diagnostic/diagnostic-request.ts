export class DiagnosticRequestError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
export async function diagnosticRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...init.headers } });
    const body = await response.json();
    if (!response.ok) throw new DiagnosticRequestError(typeof body.error === 'string' ? body.error : 'UNKNOWN', response.status);
    return body as T;
  } finally { clearTimeout(timeout); }
}
