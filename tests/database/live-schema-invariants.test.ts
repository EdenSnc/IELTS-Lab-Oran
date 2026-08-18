import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../src/lib/prisma.ts';

test('Database: Prisma client and models are initialized properly', async () => {
  assert.ok(prisma.user !== undefined, 'User model should be defined on client');
  assert.ok(prisma.testVersion !== undefined, 'TestVersion model should be defined on client');
  assert.ok(prisma.gradingRun !== undefined, 'GradingRun model should be defined on client');
  assert.ok(prisma.attemptSkillScore !== undefined, 'AttemptSkillScore model should be defined on client');
  assert.ok(prisma.bandScale !== undefined, 'BandScale model should be defined on client');
  assert.ok(prisma.speakingAppointment !== undefined, 'SpeakingAppointment model should be defined on client');
  assert.ok(prisma.speakingSession !== undefined, 'SpeakingSession model should be defined on client');
});
