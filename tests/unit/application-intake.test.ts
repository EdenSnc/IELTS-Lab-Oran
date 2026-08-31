import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationSchema, boundedTallyAnswer } from '../../src/lib/leads/application';

const validApplication = {
  schemaVersion: 2,
  discoverySource: 'social_media',
  bookedExam: false,
  bookedExamDate: null,
  targetExamDate: '2026-11-10',
  purpose: 'higher_education',
  universityAdmission: true,
  targetCountry: 'Canada',
  targetBand: '7.0',
  takenIelts: false,
  recentScore: null,
  challengingModules: ['reading', 'writing'],
  englishLevel: 'B2',
  urgencyAndObstacles: 'I need the score before my university application closes.',
  commitmentAccepted: true,
  locale: 'en',
  attribution: {
    utmTerm: null,
    utmContent: null,
    gclid: null,
    fbclid: null,
    landingPath: '/en?utm_source=google',
    referrerHost: 'google.com',
  },
} as const;

test('application intake requires the conditional test date and previous score', () => {
  assert.equal(applicationSchema.safeParse(validApplication).success, true);
  assert.equal(applicationSchema.safeParse({
    ...validApplication,
    bookedExam: true,
    bookedExamDate: null,
  }).success, false);
  assert.equal(applicationSchema.safeParse({
    ...validApplication,
    takenIelts: true,
    recentScore: null,
  }).success, false);
});

test('application intake requires commitment and at least one challenging module', () => {
  assert.equal(applicationSchema.safeParse({
    ...validApplication,
    challengingModules: [],
  }).success, false);
  assert.equal(applicationSchema.safeParse({
    ...validApplication,
    commitmentAccepted: false,
  }).success, false);
});

test('legacy Tally answers are bounded before persistence', () => {
  assert.equal((boundedTallyAnswer('x'.repeat(3_000)) as string).length, 2_000);
  assert.deepEqual(boundedTallyAnswer(['Reading', 'Writing']), ['Reading', 'Writing']);
});
