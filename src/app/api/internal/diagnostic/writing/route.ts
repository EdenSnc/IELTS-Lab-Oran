import { noStoreJson } from '@/lib/http/api';
import { diagnosticApiError } from '@/lib/diagnostic/http';
import { readDiagnosticJob } from '@/lib/diagnostic/job-http';
import { diagnosticWritingJobSchema, processDiagnosticWriting } from '@/lib/diagnostic/writing-service';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const job = await readDiagnosticJob(request,'/api/internal/diagnostic/writing',diagnosticWritingJobSchema);
    const result = await processDiagnosticWriting(job.runId);
    return noStoreJson(result,result.state === 'QUEUED' ? 503 : 200);
  } catch (error) { return diagnosticApiError(error); }
}
