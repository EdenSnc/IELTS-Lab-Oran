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

test('only study applicants need an admission answer', () => {
  assert.equal(applicationSchema.safeParse({ ...validApplication, universityAdmission: null }).success, false);
  const work = applicationSchema.parse({ ...validApplication, purpose: 'career' });
  assert.equal(work.universityAdmission, null);
});

test('new applications require flexibility or a valid local time window', () => {
  const current = { ...validApplication, schemaVersion: 3 };
  assert.equal(applicationSchema.safeParse(current).success, false);
  assert.equal(applicationSchema.safeParse({ ...current, availability: { mode: 'flexible' } }).success, true);
  const window = { day: 'fri', startHour: 17, endHour: 19 };
  assert.equal(applicationSchema.safeParse({
    ...current, availability: { mode: 'windows', windows: [window] },
  }).success, true);
  for (const windows of [[], [{ ...window, endHour: 17 }], [{ ...window, startHour: 7 }]]) {
    assert.equal(applicationSchema.safeParse({ ...current, availability: { mode: 'windows', windows } }).success, false);
  }
});

test('legacy Tally answers are bounded before persistence', () => {
  assert.equal((boundedTallyAnswer('x'.repeat(3_000)) as string).length, 2_000);
  assert.deepEqual(boundedTallyAnswer(['Reading', 'Writing']), ['Reading', 'Writing']);
});
