import 'server-only';
import path from 'node:path';
import { load } from 'cheerio';
import prisma from '@/lib/prisma';
import type { DeliverySection } from '@/lib/content/delivery-types';
import { optionsFromJson } from '@/lib/content/load-delivery-test-core';
import { sanitizeDeliveryHtml } from '@/lib/content/sanitize-delivery-html';
import { assertValidAssetStorageKey, fetchPrivateAsset } from '@/lib/content/private-asset-storage';
import { deriveDiagnosticWindow } from './session-core';
import { loadOwnedDiagnosticSource } from './session-service';
import { DiagnosticError } from './protocol';
import type { DiagnosticDeliverySection } from './delivery-protocol';

type Source = Awaited<ReturnType<typeof loadOwnedDiagnosticSource>>;
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const AUDIO_MIMES = new Set(['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm']);
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };

function currentParts(source: Source) {
  if (source.session.state !== 'ACTIVE') return [];
  const stage = deriveDiagnosticWindow({ startedAt: source.session.startedAt, now: source.now }).stage;
  if (stage === 'SUBMITTED') return [];
  return source.manifest.parts.filter(p => p.skill === stage).sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Query real foreign-key links only. No content LIKE scans or globally enumerated keys. */
async function currentAssets(source: Source) {
  const frozen = currentParts(source);
  const partIds = frozen.map(p => p.partId);
  if (!partIds.length) return [];
  const groupIds = frozen.flatMap(p => p.groupIds);
  const questionIds = source.manifest.questions.filter(q => frozen.some(p => p.displayOrder === q.partOrder)).map(q => q.questionId);
  const stimulusIds = source.parts.filter(p => partIds.includes(p.id)).flatMap(p => p.stimuli.filter(s => s.isVisibleToLearner).map(s => s.id));
  const audioIds = source.manifest.diagnostic.reviews.filter(r => partIds.includes(r.partId)).flatMap(r => r.audio ? [r.audio.assetId] : []);
  const linked = await prisma.contentAsset.findMany({ where: {
    reviewStatus: 'VERIFIED', OR: [
      { stimuli: { some: { id: { in: stimulusIds }, isVisibleToLearner: true } } },
      { questionLinks: { some: { questionGroupId: { in: groupIds } } } },
      { references: { some: { OR: [
        { testPartId: { in: partIds } }, { stimulusId: { in: stimulusIds } },
        { questionGroupId: { in: groupIds } }, { questionId: { in: questionIds } },
      ] } } },
    ],
  } });
  return linked.filter(a => {
    if (a.mimeType === 'image/svg+xml' || path.extname(a.storageKey).toLowerCase() === '.svg') return false;
    try { assertValidAssetStorageKey(a.storageKey); } catch { return false; }
    if (a.type === 'AUDIO') return audioIds.includes(a.id) && AUDIO_MIMES.has(a.mimeType);
    return IMAGE_MIMES.has(a.mimeType);
  });
}

const assetUrl = (sessionId: string, assetId: string) => `/api/diagnostic/sessions/${sessionId}/assets/${assetId}`;

export function sanitizeDiagnosticDeliveryHtml(html: string | null, sessionId: string, assets: ReadonlyArray<{ id: string; storageKey: string }>) {
  if (!html) return html;
  const byKey = new Map(assets.map(a => [a.storageKey, a.id]));
  const ids = new Set(assets.map(a => a.id));
  const source = load(html, null, false);
  // The existing sanitizer understands only the old asset prefix. Give it
  // temporary approved UUID references, then adapt sanitized src attributes.
  source('[src]').each((_, element) => {
    const src = source(element).attr('src') ?? '';
    const fromKey = src.startsWith('content-asset://') ? byKey.get(src.slice('content-asset://'.length)) : undefined;
    const fromId = /^\/api\/test-assets\/([0-9a-f-]+)$/iu.exec(src)?.[1];
    const id = fromKey ?? (fromId && ids.has(fromId) ? fromId : undefined);
    if (id) source(element).attr('src', `/api/test-assets/${id}`);
    else source(element).removeAttr('src');
  });
  const sanitized = load(sanitizeDeliveryHtml(source.html()) ?? '', null, false);
  sanitized('[src]').each((_, element) => {
    const id = /^\/api\/test-assets\/([0-9a-f-]+)$/iu.exec(sanitized(element).attr('src') ?? '')?.[1];
    if (id && ids.has(id)) sanitized(element).attr('src', assetUrl(sessionId, id));
    else sanitized(element).removeAttr('src');
  });
  // Unresolved internal pseudo URLs must not disclose private storage keys.
  return sanitized.html().replace(/content-asset:\/\/[^\s"'<>]+/gu, '');
}

export async function loadDiagnosticDelivery(input: { sessionId: string; userId: string }): Promise<DiagnosticDeliverySection | null> {
  const source = await loadOwnedDiagnosticSource(input);
  const frozenParts = currentParts(source);
  if (!frozenParts.length) return null;
  const assets = await currentAssets(source);
  const allowedIds = new Set(assets.map(a => a.id));
  const rewrite = (html: string | null) => sanitizeDiagnosticDeliveryHtml(html, input.sessionId, assets);
  const skill = frozenParts[0].skill as DeliverySection['skill'];
  return {
    id: `${input.sessionId}:${skill}`, skill,
    displayOrder: skill === 'LISTENING' ? 1 : skill === 'READING' ? 2 : 3,
    timeLimitSeconds: 1200,
    audioTracks: frozenParts.flatMap(part => {
      const audio = source.manifest.diagnostic.reviews.find(review => review.partId === part.partId)?.audio;
      return audio && allowedIds.has(audio.assetId) ? [{ id: audio.assetId,
        url: assetUrl(input.sessionId, audio.assetId), durationSeconds: audio.durationSeconds }] : [];
    }),
    parts: frozenParts.map(frozen => {
      const part = source.parts.find(p => p.id === frozen.partId)!;
      const audio = source.manifest.diagnostic.reviews.find(r => r.partId === part.id)?.audio;
      const questions = source.manifest.questions.filter(q => q.partOrder === frozen.displayOrder);
      const stimuli = part.stimuli.filter(s => s.isVisibleToLearner && s.type !== 'AUDIO_TRACK' && s.asset?.type !== 'AUDIO').map(s => ({
        id: s.id, type: s.type, displayOrder: s.displayOrder, title: s.title,
        bodyHtml: rewrite(s.bodyHtml), plainText: s.plainText,
        assetUrl: s.assetId && allowedIds.has(s.assetId) ? assetUrl(input.sessionId, s.assetId) : null,
      }));
      if (audio && allowedIds.has(audio.assetId)) stimuli.unshift({
        id: audio.assetId, type: 'AUDIO_TRACK', displayOrder: 0, title: null,
        bodyHtml: null, plainText: null, assetUrl: assetUrl(input.sessionId, audio.assetId),
      });
      return {
        id: part.id, slot: frozen.slot, title: part.title, instructionsHtml: rewrite(part.instructionsHtml),
        recommendedTimeSeconds: null, stimuli,
        questionGroups: frozen.groupIds.map((id, i) => {
          const group = part.questionGroups.find(g => g.id === id)!;
          const frozenQuestions = questions.filter(q => q.groupOrder === i + 1).sort((a, b) => a.questionOrder - b.questionOrder);
          return {
            id, displayOrder: i + 1, questionType: group.questionType, responseKind: group.responseKind,
            scoringStrategy: group.scoringStrategy,
            sourceNumberStart: group.sourceNumberStart ?? group.questions.find(q => q.id === frozenQuestions[0]?.questionId)?.sourceNumber ?? frozenQuestions[0]?.questionNumber ?? null,
            sourceNumberEnd: group.sourceNumberEnd ?? group.questions.find(q => q.id === frozenQuestions.at(-1)?.questionId)?.sourceNumber ?? frozenQuestions.at(-1)?.questionNumber ?? null,
            instructionsHtml: rewrite(group.instructionsHtml), promptHtml: rewrite(group.promptHtml),
            options: optionsFromJson(frozenQuestions[0]?.presentedOptions), maxMarks: group.maxMarks,
            minWordCount: group.minWordCount, maxWords: group.maxWords, allowNumbers: group.allowNumbers,
            rawAnswerInstruction: group.rawAnswerInstruction,
            questions: frozenQuestions.map(q => {
              const question = group.questions.find(item => item.id === q.questionId)!;
              return { id: q.questionId, stableKey: question.stableKey, sourceNumber: question.sourceNumber ?? q.questionNumber,
                displayOrder: q.questionOrder, promptHtml: rewrite(question.promptHtml), maxMarks: q.maxMarks };
            }),
          };
        }),
      };
    }),
  };
}

export async function fetchDiagnosticAsset(input: { sessionId: string; userId: string; assetId: string; range?: string | null }) {
  const source = await loadOwnedDiagnosticSource(input);
  const asset = (await currentAssets(source)).find(a => a.id === input.assetId);
  if (!asset) throw new DiagnosticError('NOT_FOUND', 404);
  assertValidAssetStorageKey(asset.storageKey);
  // Deliberately support one bounded byte range. Never forward multi-range or
  // malformed ranges that can amplify requests or select arbitrary MIME parts.
  if (input.range) {
    const match = input.range.length <= 128 ? /^bytes=(\d+)-(\d*)$/u.exec(input.range) : null;
    const start = match ? Number(match[1]) : NaN;
    const end = match?.[2] ? Number(match[2]) : null;
    if (!match || !Number.isSafeInteger(start) || (end !== null && (!Number.isSafeInteger(end) || end < start))) {
      return new Response(null, { status: 416, headers: PRIVATE_HEADERS });
    }
  }
  // The legacy helper deliberately falls back on non-OK remote responses, which
  // loses remote 416. Adapt only this transport mismatch, keeping the old runner
  // and helper unchanged; local fixtures still use fetchPrivateAsset.
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.PRIVATE_TEST_ASSET_BUCKET ?? 'protected-test-assets';
  const upstream = input.range && projectUrl && serviceKey && serviceKey.length >= 20
    ? await fetch(`${projectUrl.replace(/\/$/u, '')}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${asset.storageKey.split('/').map(encodeURIComponent).join('/')}`, {
      cache: 'no-store', headers: { apikey: serviceKey, Range: input.range,
        ...(serviceKey.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${serviceKey}` }) },
    })
    : await fetchPrivateAsset(asset.storageKey, input.range);
  if (![200, 206, 416].includes(upstream.status)) {
    await upstream.body?.cancel();
    throw new DiagnosticError('NOT_FOUND', 404);
  }
  const headers = new Headers({ ...PRIVATE_HEADERS, 'Content-Type': asset.mimeType, 'Content-Disposition': 'inline' });
  for (const name of ['Content-Range', 'Accept-Ranges', 'Content-Length']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (upstream.status === 416) await upstream.body?.cancel();
  return new Response(upstream.status === 416 ? null : upstream.body, { status: upstream.status, headers });
}
