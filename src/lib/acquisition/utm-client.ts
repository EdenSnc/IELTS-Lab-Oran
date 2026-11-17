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
    const query = new URLSearchParams(window.location.search);
    const hasAny = UTM_KEYS.some((key) => Boolean(query.get(key)));
    if (!hasAny) return;
    const next: Partial<AttributionParams> = {};
    for (const key of UTM_KEYS) {
      const value = query.get(key)?.trim();
      if (value) next[key] = value.slice(0, 200);
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage unavailable
  }
}

export function readActiveUtms(): AttributionParams {
  if (typeof window === 'undefined') {
    return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null };
  }
  const query = new URLSearchParams(window.location.search);
  const stored = readStored();
  return {
    utm_source: query.get('utm_source')?.trim() || stored.utm_source || null,
    utm_medium: query.get('utm_medium')?.trim() || stored.utm_medium || null,
    utm_campaign: query.get('utm_campaign')?.trim() || stored.utm_campaign || null,
    utm_content: query.get('utm_content')?.trim() || stored.utm_content || null,
    utm_term: query.get('utm_term')?.trim() || stored.utm_term || null,
  };
}
