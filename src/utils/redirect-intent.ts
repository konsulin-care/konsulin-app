/* eslint-disable unicorn/no-document-cookie */
export type IntentKind = 'journal' | 'appointment' | 'assessmentResult';

export interface Intent {
  kind: IntentKind;
  payload: { path: string; [key: string]: unknown };
  createdAt: number;
}

const REDIRECT_INTENT_COOKIE = 'redirect_intent';
// Keep in sync with RequireRole middleware MaxAge=300 (5 min).
const COOKIE_TTL_MS = 5 * 60 * 1000;

// localStorage-based intent (matching develop's intent-storage.ts)
const LOCAL_STORAGE_KEY = 'konsulin.intent';
const LS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const GUEST_SUBMISSION_KEY = 'konsulin.guest_submitted_at';

// REDIRECT_INTENT_COOKIE is a compile-time constant; static regex avoids false-positive scanner warnings.
const REDIRECT_INTENT_REGEX = /(?:^|;\s*)redirect_intent=([^;]*)/;

/** Reads the redirect intent cookie value. */
function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = REDIRECT_INTENT_REGEX.exec(document.cookie);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** Writes a value to the redirect intent cookie with a max age. */
function writeCookie(value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${REDIRECT_INTENT_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

/** Returns a plain URL redirect intent if one exists. */
export function getRedirectIntent(): string | null {
  const raw = readCookie();
  if (!raw) return null;
  if (!raw.startsWith('{')) return raw;
  return null;
}

/** Clears the redirect intent cookie. */
export function clearRedirectIntent(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${REDIRECT_INTENT_COOKIE}=; Path=/; Max-Age=0`;
}

/** Saves intent to both localStorage and cookie for post-auth navigation. */
export function saveIntent(
  kind: IntentKind,
  payload: { path: string; [key: string]: unknown }
): void {
  const intent: Intent = { kind, payload, createdAt: Date.now() };
  // Primary: localStorage (proven to work on develop)
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(intent));
  } catch {
    console.warn('[redirect-intent] localStorage.setItem failed in saveIntent');
  }
  // Fallback: cookie
  writeCookie(JSON.stringify(intent), COOKIE_TTL_MS / 1000);
}

/** Returns a structured redirect intent — tries localStorage first, then cookie. */
export function getIntent(): Intent | null {
  // 1. localStorage (primary — works reliably)
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const intent = JSON.parse(raw) as Intent;
      if (intent.kind && intent.createdAt) {
        if (Date.now() - intent.createdAt <= LS_TTL_MS) return intent;
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  } catch {
    console.warn(
      '[redirect-intent] localStorage.getItem/parse failed, falling through to cookie'
    );
  }

  // 2. Cookie (fallback)
  const raw = readCookie();
  if (!raw) return null;
  if (!raw.startsWith('{')) return null;
  try {
    const intent = JSON.parse(raw) as Intent;
    if (!intent.kind || !intent.createdAt) return null;
    if (Date.now() - intent.createdAt > COOKIE_TTL_MS) {
      clearRedirectIntent();
      return null;
    }
    return intent;
  } catch {
    clearRedirectIntent();
    return null;
  }
}

/** Clears intent from both localStorage and cookie. */
export function clearIntent(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    console.warn(
      '[redirect-intent] localStorage.removeItem failed in clearIntent'
    );
  }
  clearRedirectIntent();
}

/** Returns true when a pending assessmentResult claim intent exists. */
export function hasPendingAssessmentClaimIntent(): boolean {
  return getIntent()?.kind === 'assessmentResult';
}

/** Records the current time as the guest's latest submission timestamp. */
export function markGuestSubmission(now = Date.now()): void {
  try {
    localStorage.setItem(GUEST_SUBMISSION_KEY, String(now));
  } catch {
    console.warn(
      '[redirect-intent] localStorage.setItem failed in markGuestSubmission'
    );
  }
}

/** Returns true when a guest submission happened within the last 24 hours. */
export function hasRecentGuestSubmission(now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(GUEST_SUBMISSION_KEY);
    if (!raw) return false;
    const submittedAt = Number(raw);
    if (!Number.isFinite(submittedAt)) {
      localStorage.removeItem(GUEST_SUBMISSION_KEY);
      return false;
    }
    if (now - submittedAt <= LS_TTL_MS) return true;
    localStorage.removeItem(GUEST_SUBMISSION_KEY);
    return false;
  } catch {
    console.warn(
      '[redirect-intent] localStorage.getItem failed in hasRecentGuestSubmission'
    );
    return false;
  }
}

/** Clears the stored guest submission timestamp. */
export function clearGuestSubmission(): void {
  try {
    localStorage.removeItem(GUEST_SUBMISSION_KEY);
  } catch {
    console.warn(
      '[redirect-intent] localStorage.removeItem failed in clearGuestSubmission'
    );
  }
}
