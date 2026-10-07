import { noStoreJson } from '@/lib/http/api';
import { diagnosticApiError } from '@/lib/diagnostic/http';
import { readDiagnosticJob } from '@/lib/diagnostic/job-http';
import { diagnosticRecoveryJobSchema, recoverDiagnosticWriting } from '@/lib/diagnostic/writing-service';
import {runDiagnosticRetention} from '@/lib/diagnostic/retention-service';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await readDiagnosticJob(request,'/api/internal/diagnostic/recover',diagnosticRecoveryJobSchema);
    const retention=await runDiagnosticRetention();
    return noStoreJson({ retention,results: await recoverDiagnosticWriting() });
  } catch (error) { return diagnosticApiError(error); }
}
