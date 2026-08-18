export type SpeakingActor = { id: string; role: 'STUDENT' | 'TEACHER' | 'CONTENT_REVIEWER' | 'ADMIN' };
export type SpeakingOwners = { learnerId: string; examinerId: string };

export function canJoinSpeakingSession(actor: SpeakingActor, owners: SpeakingOwners) {
  return actor.id === owners.learnerId || actor.role === 'ADMIN' || (actor.role === 'TEACHER' && actor.id === owners.examinerId);
}

export function canManageSpeakingSession(actor: SpeakingActor, owners: SpeakingOwners) {
  return actor.role === 'ADMIN' || (actor.role === 'TEACHER' && actor.id === owners.examinerId);
}

export function canManageSpeakingAppointment(actor: SpeakingActor, owners: SpeakingOwners) {
  return actor.role === 'ADMIN'
    || actor.id === owners.learnerId
    || (actor.role === 'TEACHER' && actor.id === owners.examinerId);
}

export const canReadSpeakingRecording = canManageSpeakingSession;
export const canPublishSpeakingResult = canManageSpeakingSession;
