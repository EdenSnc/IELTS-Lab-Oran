import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationSchema, boundedTallyAnswer } from '../../src/lib/leads/application';
import { directLeadSchema, invalidLeadFields, normalizeLeadPhone } from '../../src/lib/leads/direct-intake';
import { resolveVisitUtms } from '../../src/lib/acquisition/utm-client';

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

test('common WhatsApp phone formats are accepted consistently and invalid fields are named', () => {
  for (const phone of ['0555 00 00 00', '213555000000', '002130555000000', '٠٥٥٥ ٠٠ ٠٠ ٠٠', '+213 (0)555 00 00 00']) {
    assert.equal(normalizeLeadPhone(phone), '+213555000000');
  }
  assert.equal(normalizeLeadPhone('+33612345678'), '+33612345678');
  assert.equal(normalizeLeadPhone('\u200e+٢١٣ (٠)٥٥٥ ٠٠ ٠٠ ٠٠\u200f'), '+213555000000');
  const result = directLeadSchema.safeParse({ phone: '0123', application: { ...validApplication, schemaVersion: 3 } });
  assert.equal(result.success, false);
  if (!result.success) assert.deepEqual(invalidLeadFields(result.error.issues), ['phone', 'availability']);
});

test('availability is ordered and overlapping or adjacent windows become one window', () => {
  const application = applicationSchema.parse({
    ...validApplication, schemaVersion: 3, availability: { mode: 'windows', windows: [
      { day: 'fri', startHour: 18, endHour: 21 },
      { day: 'sun', startHour: 8, endHour: 9 },
      { day: 'fri', startHour: 16, endHour: 18 },
      { day: 'fri', startHour: 17, endHour: 19 },
      { day: 'sun', startHour: 20, endHour: 22 },
    ] },
  });
  assert.deepEqual(application.availability, { mode: 'windows', windows: [
    { day: 'sun', startHour: 8, endHour: 9 },
    { day: 'sun', startHour: 20, endHour: 22 },
    { day: 'fri', startHour: 16, endHour: 21 },
  ] });
});

test('a retry key is optional for legacy clients and invalid keys are rejected', () => {
  const contact = { phone: '0555000000', application: validApplication };
  assert.equal(directLeadSchema.safeParse(contact).success, true);
  assert.equal(directLeadSchema.safeParse({ ...contact, submissionId: crypto.randomUUID() }).success, true);
  assert.equal(directLeadSchema.safeParse({ ...contact, submissionId: 'not-a-uuid' }).success, false);
});

test('an explicit new campaign replaces old attribution rather than inheriting a poster code', () => {
  const poster = { utm_content: 'W17khKhvB-6o', utm_source: 'ieltslab', utm_medium: 'poster' };
  assert.equal(resolveVisitUtms(new URLSearchParams(), poster).utm_content, poster.utm_content);
  const newVisit = resolveVisitUtms(new URLSearchParams('utm_source=instagram'), poster);
  assert.equal(newVisit.utm_source, 'instagram');
  assert.equal(newVisit.utm_content, null);
  assert.equal(newVisit.utm_medium, null);
});
