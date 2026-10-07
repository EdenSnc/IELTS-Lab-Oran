import 'server-only';
import{Prisma}from'@prisma/client';
import prisma from'@/lib/prisma';
import{diagnosticRecordingStorage}from'./recording-storage';
import{purgeDiagnosticRecordings}from'./recording-service';
export async function runDiagnosticRetention(storage=diagnosticRecordingStorage){
 const now=new Date(),privateCutoff=new Date(now.getTime()-30*86400000);
 const recordings=await purgeDiagnosticRecordings(storage);
 // No transcript/essay excerpts from completed or pending AI survive this
 // private-data window. Lease cancellation fences delayed Writing workers.
 const writing=await prisma.diagnosticWritingRun.updateMany({where:{createdAt:{lte:privateCutoff},OR:[{state:{in:['QUEUED','RUNNING','SUCCEEDED','FAILED']}},{feedback:{not:Prisma.DbNull}}]},
  data:{state:'CANCELLED',feedback:Prisma.DbNull,leaseOwner:null,leaseExpiresAt:null,completedAt:now,errorCode:'RETENTION_EXPIRED'}});
 const notes=await prisma.diagnosticSpeakingSession.updateMany({where:{startedAt:{lte:privateCutoff},notes:{not:''}},data:{notes:'',version:{increment:1},updatedAt:now}});
 const reports=await prisma.diagnosticAssessment.updateMany({where:{state:'RELEASED',expiresAt:{lte:now}},
  data:{state:'EXPIRED',writing:Prisma.DbNull,speaking:Prisma.DbNull,rawScores:[],nextSteps:[],version:{increment:1},updatedAt:now}});
 return{recordings,writingCleared:writing.count,notesCleared:notes.count,reportsExpired:reports.count};
}
