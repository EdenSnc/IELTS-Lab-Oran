export const CURRENT_TERMS_VERSION = '2026-09-03';
export const CURRENT_PRIVACY_VERSION = '2026-09-03';

export const CURRENT_REQUIRED_POLICIES = [
  { type: 'TERMS' as const, version: CURRENT_TERMS_VERSION },
  { type: 'PRIVACY' as const, version: CURRENT_PRIVACY_VERSION },
] as const;
