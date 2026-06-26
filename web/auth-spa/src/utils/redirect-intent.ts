export type IntentKind = 'journal' | 'appointment' | 'assessmentResult';

export interface Intent {
  kind: IntentKind;
  payload: { path: string; [key: string]: unknown };
  createdAt: number;
}

const REDIRECT_INTENT_COOKIE = 'redirect_intent';
// Keep in sync with src/utils/redirect-intent.ts and
// RequireRole middleware MaxAge=300 (5 min).
const COOKIE_TTL_MS = 5 * 60 * 1000;

// localStorage-based intent (matching src/utils/redirect-intent.ts)
const LOCAL_STORAGE_KEY = 'konsulin.intent';
const LS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// REDIRECT_INTENT_COOKIE is a compile-time constant; static regex avoids false-positive scanner warnings.
const REDIRECT_INTENT_REGEX = /(?:^|;\s*)redirect_intent=([^;]*)/;

/** Reads the redirect intent cookie value. */
function readCookie(): string | null {
  const match = REDIRECT_INTENT_REGEX.exec(document.cookie);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** Returns a plain URL redirect intent if one exists. */
export function getRedirectIntent(): string | null {
  const raw = readCookie();
  if (!raw || raw.startsWith('{')) return null;
  return raw;
}

/** Clears the redirect intent cookie. */
export function clearRedirectIntent(): void {
  document.cookie = `${REDIRECT_INTENT_COOKIE}=; Path=/; Max-Age=0`;
}

/** Saves a redirect intent to a cookie for post-auth navigation. */
export function saveIntent(
  kind: IntentKind,
  payload: { path: string; [key: string]: unknown }
): void {
  const intent: Intent = { kind, payload, createdAt: Date.now() };
  document.cookie = `${REDIRECT_INTENT_COOKIE}=${encodeURIComponent(JSON.stringify(intent))}; Path=/; Max-Age=${COOKIE_TTL_MS / 1000}; SameSite=Lax`;
}

/** Returns a structured redirect intent from cookie. */
export function getIntent(): Intent | null {
  const raw = readCookie();
  if (!raw?.startsWith('{')) return null;
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

/** Returns a structured redirect intent from localStorage (written by Next.js app). */
export function getIntentLocal(): Intent | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw) as Intent;
    if (!intent.kind || !intent.createdAt) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }
    if (Date.now() - intent.createdAt > LS_TTL_MS) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }
    return intent;
  } catch {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}
