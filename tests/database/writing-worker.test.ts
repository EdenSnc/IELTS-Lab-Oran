import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('Writing worker finalizes once and releases retryable leases before retry', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const [
    { default: prisma },
    { completeAccountOnboarding },
    { createAuthenticatedAttempt },
    { submitAndGradeObjectiveAttempt },
    { processWritingGradingRun },
    { saveHumanSpeakingAssessment },
    { recoverWritingGradingRuns },
    { loadStoredAttemptResult },
  ] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/auth/account-readiness'),
    import('../../src/lib/attempts/attempt-service'),
    import('../../src/lib/attempts/objective-attempt-grading'),
    import('../../src/lib/grading/writing-worker'),
    import('../../src/lib/speaking/assessment-service'),
    import('../../src/lib/qstash/jobs'),
    import('../../src/lib/attempts/attempt-results'),
  ]);
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: { id: randomUUID(), email: `writing-${suffix}@example.invalid` },
  });
  await completeAccountOnboarding({
    userId: user.id, name: 'Writing Learner',
    whatsapp: `+213${Math.floor(100000000 + Math.random() * 900000000)}`,
    wilaya: '31 Oran', preferredLocale: 'en', termsAccepted: true, privacyAccepted: true,
    marketingAccepted: false, acceptedFrom: 'database-test',
  });
  const source = await prisma.contentSource.create({
    data: { provider: 'OTHER', name: `writing source ${suffix}` },
  });
  const contentTest = await prisma.test.create({
    data: {
      sourceId: source.id,
      externalId: `writing-${suffix}`,
      title: 'Writing worker fixture',
      variant: 'ACADEMIC',
      sourceYear: 2026,
    },
  });
  const version = await prisma.testVersion.create({
    data: { testId: contentTest.id, version: 1, status: 'DRAFT', contentHash: `writing-${suffix}` },
  });
  const section = await prisma.testSection.create({
    data: { testVersionId: version.id, skill: 'WRITING', displayOrder: 1, timeLimitSeconds: 3_600 },
  });
  for (const taskNumber of [1, 2] as const) {
    const part = await prisma.testPart.create({
      data: {
        testSectionId: section.id,
        sourceKey: `writing-task-${taskNumber}`,
        slot: taskNumber === 1 ? 'WRITING_TASK_1' : 'WRITING_TASK_2',
        reviewStatus: 'VERIFIED',
      },
    });
    await prisma.stimulus.create({
      data: {
        testPartId: part.id,
        sourceKey: `prompt-${taskNumber}`,
        type: 'WRITING_PROMPT',
        displayOrder: 1,
        plainText: `Write task ${taskNumber}.`,
        isVisibleToLearner: true,
        reviewStatus: 'VERIFIED',
      },
    });
    await prisma.questionGroup.create({
      data: {
        testPartId: part.id,
        sourceKey: `group-${taskNumber}`,
        displayOrder: 1,
        questionType: taskNumber === 1 ? 'WRITING_TASK_1_ACADEMIC' : 'WRITING_TASK_2_ESSAY',
        responseKind: 'LONG_TEXT',
        scoringStrategy: 'RUBRIC',
        maxMarks: 0,
        minWordCount: taskNumber === 1 ? 150 : 250,
        reviewStatus: 'VERIFIED',
        questions: {
          create: {
            stableKey: `writing-${taskNumber}`,
            displayOrder: 1,
            maxMarks: 0,
          },
        },
      },
    });
  }
  await prisma.testVersion.update({
    where: { id: version.id },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
  const blueprint = await prisma.testBlueprint.create({
    data: {
      code: `writing-${suffix}`,
      version: 1,
      name: 'Writing worker fixture',
      variant: 'ACADEMIC',
      status: 'DRAFT',
      fixedTestVersionId: version.id,
      slots: {
        create: [
          { partSlot: 'WRITING_TASK_1', displayOrder: 1, targetMarks: 0 },
          { partSlot: 'WRITING_TASK_2', displayOrder: 2, targetMarks: 0 },
        ],
      },
    },
  });
  await prisma.testBlueprint.update({
    where: { id: blueprint.id },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
  const product = await prisma.product.create({
    data: {
      code: `writing-${suffix}`,
      tier: 'TIER_2_DIAGNOSTIC',
      name: 'Writing worker fixture',
      priceMinor: 100,
      maximumAttempts: 4,
      blueprints: { create: { blueprintId: blueprint.id } },
    },
  });
  const entitlement = await prisma.entitlement.create({
    data: {
      userId: user.id,
      productId: product.id,
      status: 'ACTIVE',
      startsAt: new Date(Date.now() - 60_000),
      maximumAttempts: 4,
    },
  });

  const createSubmittedRun = async () => {
    const attempt = await createAuthenticatedAttempt({
      userId: user.id,
      entitlementId: entitlement.id,
      blueprintId: blueprint.id,
      mode: 'PRACTICE',
    });
    const ordered = [...attempt.questions].sort((left, right) => left.partOrder - right.partOrder);
    await Promise.all(ordered.map((question, index) => prisma.response.update({
      where: { attemptQuestionId: question.id },
      data: { answer: `candidate response for task ${index + 1}` },
    })));
    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { state: 'ACTIVE', startedAt: new Date(), expiresAt: new Date(Date.now() + 3_600_000) },
    });
    const submitted = await submitAndGradeObjectiveAttempt(attempt.id, user.id);
    assert.ok(submitted.writingGradingRunId);
    return { attemptId: attempt.id, gradingRunId: submitted.writingGradingRunId };
  };

  const deterministicGrader = async (tasks: Array<{ taskNumber: 1 | 2 }>) => ({
    writingBand: 6.5,
    taskResults: tasks.map((task) => ({
      taskNumber: task.taskNumber,
      taskAchievementOrResponse: { band: 6.5, rationale: 'Task response is sufficiently developed for this fixture.', evidence: ['candidate'] },
      coherenceAndCohesion: { band: 6.5, rationale: 'Organisation is sufficiently clear for this fixture.', evidence: [] },
      lexicalResource: { band: 6.5, rationale: 'Vocabulary is sufficiently controlled for this fixture.', evidence: [] },
      grammaticalRangeAndAccuracy: { band: 6.5, rationale: 'Grammar is sufficiently controlled for this fixture.', evidence: [] },
      strengths: ['Clear response'],
      priorityActions: ['Develop support'],
      confidence: 'HIGH' as const,
      wordCount: 5,
      minimumWordCount: task.taskNumber === 1 ? 150 : 250,
      underLength: true,
      taskBand: 6.5,
    })),
    provider: 'google' as const,
    models: ['fixture-model'],
    promptVersion: 'writing-practice-v1' as const,
    rawResponses: ['{"fixture":true}'],
    usageMetadata: [null],
  });

  const first = await createSubmittedRun();
  const pendingResult = await loadStoredAttemptResult(first.attemptId, user.id);
  assert.equal(pendingResult.writingStatus, 'PENDING');
  assert.equal(pendingResult.overallBand, null);
  assert.deepEqual(await processWritingGradingRun(first.gradingRunId!, deterministicGrader), {
    status: 'succeeded',
    writingBand: 6.5,
  });
  assert.deepEqual(await processWritingGradingRun(first.gradingRunId!, deterministicGrader), {
    status: 'already_completed',
  });
  assert.equal(await prisma.criterionScore.count({ where: { gradingRunId: first.gradingRunId! } }), 8);
  assert.equal((await prisma.attemptSkillScore.findUniqueOrThrow({
    where: { attemptId_skill: { attemptId: first.attemptId, skill: 'WRITING' } },
  })).band?.toNumber(), 6.5);
  assert.equal((await prisma.assessmentAttempt.findUniqueOrThrow({ where: { id: first.attemptId } })).state, 'COMPLETED');
  const completedResult = await loadStoredAttemptResult(first.attemptId, user.id);
  assert.equal(completedResult.writingStatus, 'COMPLETE');
  assert.equal(completedResult.scores.find((score) => score.skill === 'WRITING')?.band, 6.5);

  const retry = await createSubmittedRun();
  await assert.rejects(processWritingGradingRun(retry.gradingRunId!, async () => {
    throw new Error('TRANSIENT_PROVIDER_FAILURE');
  }));
  const queued = await prisma.gradingRun.findUniqueOrThrow({ where: { id: retry.gradingRunId! } });
  assert.equal(queued.status, 'QUEUED');
  assert.equal(queued.leaseOwner, null);
  assert.equal(queued.leaseExpiresAt, null);
  assert.equal((await processWritingGradingRun(retry.gradingRunId!, deterministicGrader)).status, 'succeeded');

  const raced = await createSubmittedRun();
  await prisma.attemptSkillScore.createMany({ data: [
    { attemptId: raced.attemptId, skill: 'LISTENING', band: 6, finalizedAt: new Date() },
    { attemptId: raced.attemptId, skill: 'READING', band: 6.5, finalizedAt: new Date() },
  ] });
  const examiner = await prisma.user.create({
    data: { id: randomUUID(), email: `writing-race-examiner-${suffix}@example.invalid`, role: 'TEACHER' },
  });
  const appointment = await prisma.speakingAppointment.create({
    data: {
      learnerId: user.id,
      examinerId: examiner.id,
      attemptId: raced.attemptId,
      scheduledStartAt: new Date(Date.now() + 86_400_000),
      scheduledEndAt: new Date(Date.now() + 86_400_000 + 1_200_000),
      learnerTimezone: 'Africa/Algiers',
      deliveryMode: 'ONLINE',
      session: {
        create: {
          rtcProvider: 'livekit',
          rtcRoomName: `writing-race-${suffix}`,
          state: 'AWAITING_HUMAN_SCORE',
          startedAt: new Date(),
          endedAt: new Date(),
        },
      },
    },
    include: { session: true },
  });
  const raceSpeakingSession = await prisma.speakingSession.findUniqueOrThrow({
    where: { appointmentId: appointment.id },
  });
  let releaseGrader!: () => void;
  let markGraderStarted!: () => void;
  const graderStarted = new Promise<void>((resolve) => { markGraderStarted = resolve; });
  const graderRelease = new Promise<void>((resolve) => { releaseGrader = resolve; });
  const writingInFlight = processWritingGradingRun(raced.gradingRunId!, async (tasks) => {
    markGraderStarted();
    await graderRelease;
    return deterministicGrader(tasks);
  });
  await graderStarted;
  const speakingScores = {
    fluencyCoherence: 6, lexicalResource: 6.5, grammaticalRange: 6, pronunciation: 6.5,
  };
  await saveHumanSpeakingAssessment({
    user: examiner, sessionId: raceSpeakingSession.id, stage: 'PROVISIONAL', scores: speakingScores,
  });
  await saveHumanSpeakingAssessment({
    user: examiner, sessionId: raceSpeakingSession.id, stage: 'FINAL', scores: speakingScores,
  });
  assert.equal((await prisma.assessmentAttempt.findUniqueOrThrow({ where: { id: raced.attemptId } })).state, 'GRADING');
  releaseGrader();
  await writingInFlight;
  const raceCompleted = await prisma.assessmentAttempt.findUniqueOrThrow({ where: { id: raced.attemptId } });
  assert.equal(raceCompleted.state, 'COMPLETED');
  assert.equal(raceCompleted.overallBand?.toNumber(), 6.5);
  assert.equal(await prisma.attemptSkillScore.count({ where: { attemptId: raced.attemptId } }), 4);

  const expired = await createSubmittedRun();
  await prisma.gradingRun.update({
    where: { id: expired.gradingRunId! },
    data: {
      status: 'RUNNING',
      leaseOwner: 'crashed-worker',
      leaseExpiresAt: new Date(Date.now() - 60_000),
      lastEnqueuedAt: null,
    },
  });
  const published: string[] = [];
  const recovered = await recoverWritingGradingRuns(25, async (gradingRunId) => {
    published.push(gradingRunId);
  });
  assert.ok(published.includes(expired.gradingRunId));
  assert.ok(recovered.some((item) => item.id === expired.gradingRunId && item.published));
  const recoveredRun = await prisma.gradingRun.findUniqueOrThrow({ where: { id: expired.gradingRunId! } });
  assert.equal(recoveredRun.status, 'QUEUED');
  assert.equal(recoveredRun.leaseOwner, null);
  assert.equal(recoveredRun.leaseExpiresAt, null);
});
