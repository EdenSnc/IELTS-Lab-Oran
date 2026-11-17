import { DIAGNOSTIC_PROFILE } from './policy';
export function deriveDiagnosticSpeakingWindow({startedAt,now}:{startedAt:Date;now:Date}) {
  const start=startedAt.getTime(),current=now.getTime();
  if(!Number.isFinite(start)||!Number.isFinite(current)||current<start) throw new Error('INVALID_SPEAKING_CLOCK');
  const durations=DIAGNOSTIC_PROFILE.speaking;
  const phases=[['PART_1',durations.part1Seconds],['PREPARATION',durations.preparationSeconds],['PART_2',durations.part2Seconds],['PART_3',durations.part3Seconds]] as const;
  let end=start;
  const deadline=new Date(start+420000);
  for(const [stage,seconds] of phases){end+=seconds*1000;if(current<end)return{stage,remainingSeconds:Math.ceil((end-current)/1000),sectionDeadline:new Date(end),deadline};}
  return{stage:'COMPLETE' as const,remainingSeconds:0,sectionDeadline:null,deadline};
}
export function diagnosticRecordingEligibility(input:{adultAttested:boolean;recordingConsented:boolean;aiConsented:boolean}) {
  const canRecord=input.adultAttested&&input.recordingConsented;
  return{canRecord,canAnalyse:canRecord&&input.aiConsented};
}
export const DIAGNOSTIC_RECORDING_POLICY_VERSION='diagnostic-recording-v1';
export const DIAGNOSTIC_AI_POLICY_VERSION='diagnostic-ai-v1';
