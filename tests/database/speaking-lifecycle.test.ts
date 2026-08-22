import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('Speaking booking is pooled, overlap-safe, owned, consented, and human-final', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const [
    { default: prisma },
    { bookSpeakingAppointment, pooledAvailableSlots },
    { recordSpeakingConsent, hasSpeakingAiConsent },
    { saveHumanSpeakingAssessment },
    { loadStoredAttemptResult },
    { localDateKey, zonedLocalToUtc },
  ] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/speaking/booking-service'),
    import('../../src/lib/speaking/consent-service'),
    import('../../src/lib/speaking/assessment-service'),
    import('../../src/lib/attempts/attempt-results'),
    import('../../src/lib/speaking/scheduling'),
  ]);

  const suffix = randomUUID();
  const [learnerOne, learnerTwo, examiner, otherExaminer] = await Promise.all([
    prisma.user.create({ data: { id: randomUUID(), email: `speaking-one-${suffix}@example.invalid` } }),
    prisma.user.create({ data: { id: randomUUID(), email: `speaking-two-${suffix}@example.invalid` } }),
    prisma.user.create({ data: { id: randomUUID(), email: `examiner-${suffix}@example.invalid`, role: 'TEACHER' } }),
    prisma.user.create({ data: { id: randomUUID(), email: `other-examiner-${suffix}@example.invalid`, role: 'TEACHER' } }),
  ]);
  const blueprint = await prisma.testBlueprint.create({
    data: {
      code: `speaking-${suffix}`,
      version: 1,
      name: 'Speaking lifecycle fixture',
      variant: 'ACADEMIC',
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });
  const [attemptOne, attemptTwo] = await Promise.all([
    prisma.assessmentAttempt.create({
      data: {
        userId: learnerOne.id,
        blueprintId: blueprint.id,
        state: 'GRADING',
        mode: 'STRICT',
        randomSeed: randomUUID(),
        startedAt: new Date(),
        submittedAt: new Date(),
      },
    }),
    prisma.assessmentAttempt.create({
      data: {
        userId: learnerTwo.id,
        blueprintId: blueprint.id,
        state: 'GRADING',
        mode: 'STRICT',
        randomSeed: randomUUID(),
        startedAt: new Date(),
        submittedAt: new Date(),
      },
    }),
  ]);
  const future = new Date(Date.now() + 14 * 86_400_000);
  const date = localDateKey(future, 'Africa/Algiers');
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  await prisma.speakingAvailabilityRule.create({
    data: {
      examinerId: examiner.id,
      weekday,
      startMinute: 600,
      endMinute: 620,
      timezone: 'Africa/Algiers',
      appointmentDurationMinutes: 20,
      deliveryMode: 'ONLINE',
    },
  });
  const startAt = zonedLocalToUtc(date, 600, 'Africa/Algiers');
  assert.equal((await pooledAvailableSlots(date, 'ONLINE')).length, 1);
  assert.equal((await pooledAvailableSlots(date, 'IN_PERSON')).length, 0);

  const bookingInput = (user: typeof learnerOne, attemptId: string) => ({
    user,
    attemptId,
    startAt,
    learnerTimezone: 'Africa/Algiers',
    deliveryMode: 'ONLINE' as const,
  });
  const bookings = await Promise.allSettled([
    bookSpeakingAppointment(bookingInput(learnerOne, attemptOne.id)),
    bookSpeakingAppointment(bookingInput(learnerTwo, attemptTwo.id)),
  ]);
  assert.equal(bookings.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(bookings.filter((result) => result.status === 'rejected').length, 1);
  const winningIndex = bookings.findIndex((result) => result.status === 'fulfilled');
  const winner = winningIndex === 0 ? learnerOne : learnerTwo;
  const loser = winningIndex === 0 ? learnerTwo : learnerOne;
  const winningAttempt = winningIndex === 0 ? attemptOne : attemptTwo;
  const booking = bookings[winningIndex].status === 'fulfilled' ? bookings[winningIndex].value : null;
  assert.ok(booking);
  assert.deepEqual(Object.keys(booking).sort(), ['appointmentId', 'sessionId'], 'learner response does not expose examiner identity');
  assert.equal(await prisma.speakingAppointment.count({ where: { examinerId: examiner.id, status: 'BOOKED' } }), 1);
  await assert.rejects(
    bookSpeakingAppointment(bookingInput(loser, winningAttempt.id)),
    (error: Error) => error.message === 'ATTEMPT_NOT_FOUND',
  );

  const consent = await recordSpeakingConsent({
    sessionId: booking.sessionId,
    learnerId: winner.id,
    aiAnalysis: true,
    trainingData: false,
  });
  assert.deepEqual(consent, { consented: true, aiAnalysis: true, trainingData: false });
  await recordSpeakingConsent({
    sessionId: booking.sessionId,
    learnerId: winner.id,
    aiAnalysis: true,
    trainingData: false,
  });
  assert.equal(await hasSpeakingAiConsent(booking.sessionId, winner.id), true);
  await assert.rejects(
    recordSpeakingConsent({
      sessionId: booking.sessionId,
      learnerId: loser.id,
      aiAnalysis: true,
      trainingData: true,
    }),
    (error: Error) => error.message === 'SESSION_NOT_FOUND',
  );
  const consentRows = await prisma.consentRecord.findMany({
    where: { userId: winner.id, acceptedFrom: `speaking-session:${booking.sessionId}` },
    orderBy: { type: 'asc' },
    select: { type: true, action: true },
  });
  assert.deepEqual(consentRows, [
    { type: 'RECORDING', action: 'ACCEPTED' },
    { type: 'AI_ASSISTED_GRADING', action: 'ACCEPTED' },
    { type: 'TRAINING_DATA', action: 'WITHDRAWN' },
  ]);

  await prisma.speakingSession.update({
    where: { id: booking.sessionId },
    data: { state: 'AWAITING_HUMAN_SCORE', startedAt: new Date(), endedAt: new Date() },
  });
  await prisma.attemptSkillScore.createMany({
    data: [
      { attemptId: winningAttempt.id, skill: 'LISTENING', band: 6, finalizedAt: new Date() },
      { attemptId: winningAttempt.id, skill: 'READING', band: 6.5, finalizedAt: new Date() },
      { attemptId: winningAttempt.id, skill: 'WRITING', band: 6, finalizedAt: new Date() },
    ],
  });
  const scores = {
    fluencyCoherence: 6,
    lexicalResource: 6.5,
    grammaticalRange: 6,
    pronunciation: 6.5,
  };
  await assert.rejects(
    saveHumanSpeakingAssessment({ user: otherExaminer, sessionId: booking.sessionId, stage: 'PROVISIONAL', scores }),
    (error: Error) => error.message === 'FORBIDDEN',
  );
  await saveHumanSpeakingAssessment({ user: examiner, sessionId: booking.sessionId, stage: 'PROVISIONAL', scores });
  const final = await saveHumanSpeakingAssessment({ user: examiner, sessionId: booking.sessionId, stage: 'FINAL', scores });
  assert.equal(final.overallBand.toNumber(), 6.5);
  const repeated = await saveHumanSpeakingAssessment({ user: examiner, sessionId: booking.sessionId, stage: 'FINAL', scores });
  assert.equal(repeated.id, final.id, 'final human result is stored and not recalculated');
  assert.equal(await prisma.gradingRun.count({
    where: { attemptId: winningAttempt.id, skill: 'SPEAKING', graderKind: 'HUMAN', isFinal: true },
  }), 1);
  assert.equal(await prisma.gradingRun.count({
    where: { attemptId: winningAttempt.id, skill: 'SPEAKING', graderKind: 'AI', isFinal: true },
  }), 0, 'AI analysis never becomes the authoritative final Speaking score');
  const stored = await loadStoredAttemptResult(winningAttempt.id, winner.id);
  assert.equal(stored.speakingStatus, 'COMPLETE');
  assert.equal(stored.scores.find((score) => score.skill === 'SPEAKING')?.band, 6.5);
  assert.equal(stored.overallBand, 6.5, '6.25 LRWS average rounds to 6.5');
  assert.equal(stored.state, 'COMPLETED');

  await prisma.$disconnect();
});
