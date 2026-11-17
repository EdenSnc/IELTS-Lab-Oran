import { z } from 'zod';
import { requireRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { assertSameOrigin,parseDiagnosticBody,diagnosticApiError } from '@/lib/diagnostic/http';
import { listReadiness,startReadiness } from '@/lib/diagnostic/readiness-service';
import { readinessIntakeSchema } from '@/lib/diagnostic/readiness-policy';
export const runtime='nodejs';
export async function GET(request:Request){try{const u=await requireRequestUser(request,['STUDENT']);return noStoreJson({invitations:await listReadiness(u.id)});}catch(e){return diagnosticApiError(e);}}
export async function POST(request:Request){try{assertSameOrigin(request);const u=await requireRequestUser(request,['STUDENT']);
 const body=await parseDiagnosticBody(request,z.object({invitationId:z.uuid(),intake:readinessIntakeSchema}).strict());
 return noStoreJson({session:await startReadiness({userId:u.id,...body})});}catch(e){return diagnosticApiError(e);}}
