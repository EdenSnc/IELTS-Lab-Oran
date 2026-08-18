import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { speakingAnalysisSchema, validateGrounding } from '../src/lib/speaking/analysis-schema.ts';
import { buildSpeakingAnalysisPayload } from '../src/lib/speaking/analysis-prompt.ts';
import { assertSessionTransition, deriveSpeakingBand, fullMockOverall } from '../src/lib/speaking/lifecycle.ts';
import { canJoinSpeakingSession, canManageSpeakingAppointment, canPublishSpeakingResult, canReadSpeakingRecording } from '../src/lib/speaking/permissions.ts';
import { canCancelAppointment, generateSpeakingSlots, zonedLocalToUtc } from '../src/lib/speaking/scheduling.ts';

const monday = '2026-08-17';
const rule = { weekday: 1, startMinute: 600, endMinute: 660, timezone: 'Africa/Algiers', appointmentDurationMinutes: 20, deliveryMode: 'ONLINE' as const };
const base = generateSpeakingSlots({ date: monday, rules: [rule], overrides: [], occupied: [], now: new Date('2026-08-01T00:00:00Z') });
assert.equal(base.length, 3, '20-minute slots are generated');
assert.equal(base[0].start.toISOString(), '2026-08-17T09:00:00.000Z', 'Africa/Algiers local time is converted to UTC');
assert.equal(zonedLocalToUtc('2026-01-15', 540, 'America/New_York').toISOString(), '2026-01-15T14:00:00.000Z');

const occupied = generateSpeakingSlots({ date: monday, rules: [rule], overrides: [], occupied: [{ start: base[1].start, end: base[1].end }], now: new Date('2026-08-01T00:00:00Z') });
assert.deepEqual(occupied.map((slot) => slot.start.toISOString()), [base[0].start.toISOString(), base[2].start.toISOString()], 'occupied slots are removed');
const blackout = generateSpeakingSlots({ date: monday, rules: [rule], overrides: [{ date: new Date(`${monday}T00:00:00Z`), kind: 'BLACKOUT', timezone: 'Africa/Algiers' }], occupied: [], now: new Date('2026-08-01T00:00:00Z') });
assert.equal(blackout.length, 0, 'blackout overrides recurring availability');
const extraWindow = generateSpeakingSlots({
  date: monday,
  rules: [rule],
  overrides: [{ date: new Date(`${monday}T00:00:00Z`), kind: 'AVAILABLE', startMinute: 780, endMinute: 840, appointmentDurationMinutes: 20, timezone: 'Africa/Algiers' }],
  occupied: [],
  now: new Date('2026-08-01T00:00:00Z'),
});
assert.equal(extraWindow.length, 3, 'date-specific availability replaces the recurring window');
assert.equal(extraWindow[0].start.toISOString(), '2026-08-17T12:00:00.000Z');
const adjacentBooking = generateSpeakingSlots({
  date: monday,
  rules: [rule],
  overrides: [],
  occupied: [{ start: new Date('2026-08-17T07:40:00.000Z'), end: base[0].start }],
  now: new Date('2026-08-01T00:00:00Z'),
});
assert.equal(adjacentBooking.length, 3, 'adjacent appointments do not incorrectly overlap');
const outsideValidity = generateSpeakingSlots({
  date: monday,
  rules: [{ ...rule, validUntil: new Date('2026-08-16T00:00:00Z') }],
  overrides: [], occupied: [], now: new Date('2026-08-01T00:00:00Z'),
});
assert.equal(outsideValidity.length, 0, 'expired recurring rules generate no slots');
const fullDay = generateSpeakingSlots({ date: monday, deliveryMode: 'ONLINE', rules: [{ ...rule, startMinute: 600, endMinute: 1200 }], overrides: [], occupied: [], now: new Date('2026-08-01T00:00:00Z') });
assert.equal(fullDay.length, 30, '10:00–20:00 produces thirty 20-minute slots');
assert.equal(fullDay.at(-1)?.start.toISOString(), '2026-08-17T18:40:00.000Z', 'the final slot starts at 19:40 Africa/Algiers');
assert.equal(generateSpeakingSlots({ date: monday, deliveryMode: 'IN_PERSON', rules: [rule], overrides: [], occupied: [], now: new Date('2026-08-01T00:00:00Z') }).length, 0, 'online availability is not offered for in-centre bookings');
assert.equal(canCancelAppointment(new Date('2026-08-17T08:00:00Z'), new Date('2026-08-17T03:00:00Z'), 4), true);
assert.equal(canCancelAppointment(new Date('2026-08-17T08:00:00Z'), new Date('2026-08-17T05:00:00Z'), 4), false);

assert.doesNotThrow(() => assertSessionTransition('READY', 'LIVE_PART_1'));
assert.throws(() => assertSessionTransition('READY', 'LIVE_PART_3'), /INVALID_SESSION_TRANSITION/);
assert.equal(deriveSpeakingBand([6, 6.5, 6, 6.5]), 6.5);
assert.equal(fullMockOverall([{ skill: 'LISTENING', band: 7 }, { skill: 'READING', band: 7 }, { skill: 'WRITING', band: 6.5 }]), null, 'full result waits for Speaking');
assert.equal(fullMockOverall([{ skill: 'LISTENING', band: 7 }, { skill: 'READING', band: 7 }, { skill: 'WRITING', band: 6.5 }, { skill: 'SPEAKING', band: 6.5 }]), 7);

const learner = { id: 'learner', role: 'STUDENT' as const };
const other = { id: 'other', role: 'STUDENT' as const };
const examiner = { id: 'examiner', role: 'TEACHER' as const };
const owners = { learnerId: 'learner', examinerId: 'examiner' };
assert.equal(canJoinSpeakingSession(learner, owners), true);
assert.equal(canJoinSpeakingSession(other, owners), false, 'learner cannot enter another learner session');
assert.equal(canReadSpeakingRecording(learner, owners), false, 'learner cannot fetch private examiner recording');
assert.equal(canPublishSpeakingResult(learner, owners), false, 'learner cannot publish a score');
assert.equal(canPublishSpeakingResult(examiner, owners), true);
assert.equal(canManageSpeakingAppointment(learner, owners), true, 'learner can manage their own appointment');
assert.equal(canManageSpeakingAppointment(examiner, owners), true, 'assigned examiner can manage the appointment');
assert.equal(canManageSpeakingAppointment({ id: 'different-examiner', role: 'TEACHER' }, owners), false, 'another examiner cannot manage the appointment');

const payload = buildSpeakingAnalysisPayload({ sessionId: 'session', contentSnapshot: {}, transcriptSegments: [], examinerMarkers: [] });
assert.equal(payload.includes('provisional'), false, 'independent AI input excludes provisional scores');
assert.equal(payload.includes('humanScore'), false);
assert.equal(speakingAnalysisSchema.safeParse({}).success, false, 'malformed AI output is rejected');
const criterion = { suggestedBand: 6, confidence: .8, insufficientEvidence: false, evidence: [{ startMs: 100, endMs: 200, observation: 'Grounded', transcriptReference: 'hello', whyItMatters: 'Flow', confidence: .8 }, { startMs: 900, endMs: 950, observation: 'Invented', whyItMatters: 'None', confidence: .8 }] };
const analysis = speakingAnalysisSchema.parse({ transcript: { segments: [{ speaker: 'candidate', startMs: 0, endMs: 500, text: 'hello there' }] }, criterionAnalysis: { fluencyCoherence: structuredClone(criterion), lexicalResource: structuredClone(criterion), grammaticalRangeAccuracy: structuredClone(criterion), pronunciation: structuredClone(criterion) }, observations: [], metrics: {}, suggestedPriorities: [], uncertainty: { summary: '', insufficientAudioRanges: [] }, warnings: [] });
validateGrounding(analysis);
assert.equal(analysis.criterionAnalysis.fluencyCoherence.evidence.length, 1, 'ungrounded AI evidence is discarded');

const constraints = await readFile(new URL('../prisma/postgres-constraints.sql', import.meta.url), 'utf8');
assert.match(constraints, /SpeakingAppointment_no_examiner_overlap/);
assert.match(constraints, /EXCLUDE USING gist/, 'database exclusion prevents simultaneous overlapping bookings');
const schema = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
assert.match(schema, /providerCallbackId\s+String\?\s+@unique/, 'recording callback idempotency is persisted');
assert.match(schema, /examinerNotes\s+String\?\s+@db\.Text/, 'live examiner notes are durable');
const bookingUi = await readFile(new URL('../src/components/speaking/SpeakingBookingDashboard.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(bookingUi, /examiner\.name|examinerId|Choose examiner/, 'candidate UI does not expose or select examiners');
assert.match(bookingUi, /Choose an available time/, 'learner booking explicitly requires an available time slot');
assert.match(bookingUi, /In centre/, 'learner can choose an in-centre appointment');
assert.match(bookingUi, /Only days with at least one open appointment are shown/, 'candidate sees bookable days only');
assert.match(bookingUi, /availableDates\.slice/, 'available days are progressively disclosed instead of rendering an oversized calendar');
assert.doesNotMatch(bookingUi, /calendarCells|visibleMonth|type="date"|Another date|nextDates/, 'booking does not render unavailable calendar days or duplicate date selectors');
assert.match(bookingUi, /Confirm appointment/, 'learner confirms the selected slot before booking');
const examinerUi = await readFile(new URL('../src/components/speaking/ExaminerDashboard.tsx', import.meta.url), 'utf8');
assert.match(examinerUi, /Weekly schedule/);
assert.match(examinerUi, /Candidates never see examiner identities/);
assert.match(examinerUi, /How to publish your appointment slots/, 'examiner dashboard explains where availability is entered');
assert.match(examinerUi, /Date overrides/);
assert.match(examinerUi, /Need review/);
assert.match(examinerUi, /recurring-bulk/, 'examiner can publish one window across multiple selected days');
assert.match(examinerUi, /Remove selected/, 'examiner can bulk-remove published windows');
const reviewUi = await readFile(new URL('../src/components/speaking/SpeakingReview.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(reviewUi, /setPriorities\(nextPriorities/, 'analysis suggestions are not silently selected for publication');
const brandCss = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8');
assert.match(brandCss, /ielts-test-brand--responsive/, 'test branding has an explicit mobile-responsive treatment');
assert.match(brandCss, /font-family: Inter/, 'test branding uses the landing-page font');
const testBrand = await readFile(new URL('../src/components/brand/TestBrand.tsx', import.meta.url), 'utf8');
assert.match(testBrand, /ielts-lab-mark\.svg/, 'shared test branding uses the vector logo');
assert.match(testBrand, /href\?: string/, 'shared branding can link home outside active tests');
const testInstructions = await readFile(new URL('../src/components/mock-test/TestInstructions.tsx', import.meta.url), 'utf8');
assert.match(testInstructions, /TestBrand compact href="\/en"/, 'between-section branding links home');
const testHeader = await readFile(new URL('../src/components/mock-test/TestHeader.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(testHeader, /TestBrand compact[^>]*href=/, 'active timed-test branding is intentionally not a navigation link');
const nextConfig = await readFile(new URL('../next.config.ts', import.meta.url), 'utf8');
assert.match(nextConfig, /camera=\(self\)/, 'production permissions policy permits the Speaking camera');
assert.match(nextConfig, /wss:\/\//, 'production CSP includes the configured RTC websocket origin');
const slotsRoute = await readFile(new URL('../src/app/api/speaking/slots/route.ts', import.meta.url), 'utf8');
assert.doesNotMatch(slotsRoute, /examinerId/, 'candidate slot endpoint returns pooled availability without examiner identifiers');
assert.match(slotsRoute, /pooledAvailableDates/, 'candidate can fetch a bounded summary of bookable dates');
const availabilityRoute = await readFile(new URL('../src/app/api/speaking/availability/route.ts', import.meta.url), 'utf8');
assert.match(availabilityRoute, /recurring-bulk/, 'staff availability API accepts multi-day publishing');
assert.match(availabilityRoute, /ruleIds/, 'staff availability API supports authorized bulk removal');
const examinerRoute = await readFile(new URL('../src/app/api/speaking/examiners/route.ts', import.meta.url), 'utf8');
assert.match(examinerRoute, /\['TEACHER', 'ADMIN'\]/, 'examiner directory is staff-only');
const rtcProvider = await readFile(new URL('../src/lib/speaking/rtc-provider.ts', import.meta.url), 'utf8');
assert.doesNotMatch(rtcProvider, /participantRole}:\$\{input\.userId/, 'RTC identities never contain an examiner user id');

console.log('Speaking domain smoke tests passed');
