import 'server-only';
import { z } from 'zod';

export type DiagnosticWritingProvider = 'gemini' | 'deepseek';
const modelName = z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9._-]+$/u);

// Only readiness Writing is switchable; audio and the older diagnostic stay Gemini.
export function readDiagnosticWritingProvider(source: Record<string,string|undefined> = process.env, readiness = true) {
  const provider = readiness ? source.DIAGNOSTIC_WRITING_PROVIDER || 'gemini' : 'gemini';
  const result = z.object({ provider: z.enum(['gemini', 'deepseek']), model: modelName }).safeParse({
    provider,
    model: provider === 'deepseek' ? source.DIAGNOSTIC_DEEPSEEK_MODEL || 'deepseek-flash'
      : source.DIAGNOSTIC_WRITING_MODEL || 'gemini-3.5-flash-lite',
  });
  if (!result.success) throw new Error('AI_PROVIDER_CONFIGURATION');
  return result.data;
}

async function boundedJson(response: Response) {
  if (!response.body) throw new Error('DIAGNOSTIC_WRITING_OUTPUT_INVALID');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read().catch(()=>{throw new Error('AI_PROVIDER_RETRYABLE');}); if (done) break;
      size += value.byteLength;
      if (size > 65536) { await reader.cancel(); throw new Error('DIAGNOSTIC_WRITING_OUTPUT_INVALID'); }
      parts.push(value);
    }
    try{return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts))) as unknown;}
    catch{throw new Error('DIAGNOSTIC_WRITING_OUTPUT_INVALID');}
  }
  finally { reader.releaseLock(); }
}

export async function generateDeepSeekWriting(input: {
  apiKey: string; model: string; system: string; data: string; schema: z.ZodType;
  transport?: typeof fetch;
}) {
  if (!input.apiKey?.trim()) throw new Error('AI_PROVIDER_CONFIGURATION');
  const response = await (input.transport ?? fetch)('https://api.deepseek.com/chat/completions', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.apiKey}` },
    body: JSON.stringify({ model: modelName.parse(input.model), max_tokens: 3000,
      thinking: { type: 'disabled' }, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${input.system}\nReturn JSON only, matching this schema exactly:\n${JSON.stringify(z.toJSONSchema(input.schema))}` },
        { role: 'user', content: input.data },
      ],
    }),
  });
  if (!response.ok) {
    await response.body?.cancel(); // Never log a provider body or authorization header.
    const code = response.status === 429 ? 'AI_PROVIDER_RATE_LIMIT' : response.status === 402 ? 'AI_PROVIDER_BALANCE'
      : [400, 401, 403, 404, 422].includes(response.status) ? 'AI_PROVIDER_CONFIGURATION' : 'AI_PROVIDER_RETRYABLE';
    throw new Error(code);
  }
  const result = z.object({ model: modelName, choices: z.array(z.object({ finish_reason: z.literal('stop'),
    message: z.object({ content: z.string().min(1) }) })).length(1),
    usage: z.object({ prompt_tokens: z.number().int().nonnegative().max(10000000),
      completion_tokens: z.number().int().nonnegative().max(10000000) }).optional(),
  }).safeParse(await boundedJson(response));
  if (!result.success) throw new Error('DIAGNOSTIC_WRITING_OUTPUT_INVALID');
  let feedback: unknown;
  try { feedback = input.schema.parse(JSON.parse(result.data.choices[0].message.content)); }
  catch { throw new Error('DIAGNOSTIC_WRITING_OUTPUT_INVALID'); }
  return { feedback, model: `deepseek:${result.data.model}`, usage: {
    inputTokens: result.data.usage?.prompt_tokens ?? 0, outputTokens: result.data.usage?.completion_tokens ?? 0,
  } };
}
