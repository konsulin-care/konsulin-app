export type IntentKind = 'journal' | 'appointment' | 'assessmentResult';

export interface Intent {
  kind: IntentKind;
  payload: Record<string, unknown>;
  createdAt: number;
}

const REDIRECT_INTENT_COOKIE = 'redirect_intent';
// Keep in sync with src/utils/redirect-intent.ts and
// RequireRole middleware MaxAge=300 (5 min).
const TTL_MS = 5 * 60 * 1000;

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
  payload: Record<string, unknown>
): void {
  const intent: Intent = { kind, payload, createdAt: Date.now() };
  document.cookie = `${REDIRECT_INTENT_COOKIE}=${encodeURIComponent(JSON.stringify(intent))}; Path=/; Max-Age=${TTL_MS / 1000}; SameSite=Lax`;
}

/** Returns a structured redirect intent if one exists and is not expired. */
export function getIntent(): Intent | null {
  const raw = readCookie();
  if (!raw?.startsWith('{')) return null;
  try {
    const intent = JSON.parse(raw) as Intent;
    if (!intent.kind || !intent.createdAt) return null;
    if (Date.now() - intent.createdAt > TTL_MS) {
      clearRedirectIntent();
      return null;
    }
    return intent;
  } catch {
    clearRedirectIntent();
    return null;
  }
}
