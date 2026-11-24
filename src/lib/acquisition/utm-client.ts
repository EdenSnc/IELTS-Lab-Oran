'use client';

const STORAGE_KEY = 'ieltslab_attribution_v1';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export type AttributionParams = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

function taggedVisit(query: URLSearchParams): Partial<AttributionParams> | null {
  const next: Partial<AttributionParams> = {};
  for (const key of UTM_KEYS) {
    const value = query.get(key)?.trim();
    if (value) next[key] = value.slice(0, 200);
  }
  return Object.keys(next).length ? next : null;
}

export function resolveVisitUtms(query: URLSearchParams, previous: Partial<AttributionParams>): AttributionParams {
  const active = taggedVisit(query) ?? previous;
  return {
    utm_source: active.utm_source ?? null,
    utm_medium: active.utm_medium ?? null,
    utm_campaign: active.utm_campaign ?? null,
    utm_content: active.utm_content ?? null,
    utm_term: active.utm_term ?? null,
  };
}

function readStored(): Partial<AttributionParams> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: Partial<AttributionParams> = {};
    for (const key of UTM_KEYS) {
      const value = parsed[key];
      if (typeof value === 'string' && value.trim()) clean[key] = value.trim().slice(0, 200);
    }
    return clean;
  } catch {
    return {};
  }
}

export function captureLandingUtms() {
  if (typeof window === 'undefined') return;
  try {
    const next = taggedVisit(new URLSearchParams(window.location.search));
    if (next) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage unavailable
  }
}

export function readActiveUtms(): AttributionParams {
  if (typeof window === 'undefined') {
    return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null };
  }
  return resolveVisitUtms(new URLSearchParams(window.location.search), readStored());
}
