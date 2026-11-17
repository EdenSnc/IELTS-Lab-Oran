import {noStoreJson} from '@/lib/http/api';
import {diagnosticApiError} from '@/lib/diagnostic/http';
import {readDiagnosticJob} from '@/lib/diagnostic/job-http';
import {diagnosticSpeakingJobSchema,processDiagnosticSpeakingAnalysis} from '@/lib/diagnostic/analysis-service';
export const runtime='nodejs';
export const maxDuration=120;
export async function POST(request:Request){
  try{const job=await readDiagnosticJob(request,'/api/internal/diagnostic/speaking',diagnosticSpeakingJobSchema);
    const result=await processDiagnosticSpeakingAnalysis(job.runId);return noStoreJson(result,result.state==='QUEUED'?503:200);
  }catch(error){return diagnosticApiError(error);}
}
