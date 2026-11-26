export interface CookieConsentState {
  readonly version: number;
  readonly necessary: true;
  readonly preferences: boolean;
  readonly analytics: boolean;
  readonly marketing: boolean;
  readonly updatedAt: string;
}

export const CONSENT_STORAGE_KEY = 'vdf_lgpd_consent_v1';

export function createDefaultConsent(): CookieConsentState {
  return {
    version: 1,
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
    updatedAt: ''
  };
}

export function parseStoredConsent(raw: string | null): CookieConsentState | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    if (obj.version !== 1 || obj.necessary !== true) return null;
    return {
      version: 1,
      necessary: true,
      preferences: obj.preferences === true,
      analytics: obj.analytics === true,
      marketing: obj.marketing === true,
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : ''
    };
  } catch {
    return null;
  }
}

export function buildConsentDecision(
  decision: { preferences: boolean; analytics: boolean; marketing: boolean },
  now: Date = new Date()
): CookieConsentState {
  return {
    version: 1,
    necessary: true,
    preferences: Boolean(decision.preferences),
    analytics: Boolean(decision.analytics),
    marketing: Boolean(decision.marketing),
    updatedAt: now.toISOString()
  };
}
