export type IntentKind = 'journal' | 'appointment' | 'assessmentResult';

export interface Intent {
  kind: IntentKind;
  payload: any;
  createdAt: number;
}

const REDIRECT_INTENT_COOKIE = 'redirect_intent';
// Keep in sync with web/auth-spa/src/utils/redirect-intent.ts and
// RequireRole middleware MaxAge=300 (5 min).
const TTL_MS = 5 * 60 * 1000;

function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${REDIRECT_INTENT_COOKIE}=([^;]*)`)
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function writeCookie(value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${REDIRECT_INTENT_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function getRedirectIntent(): string | null {
  const raw = readCookie();
  if (!raw) return null;
  // If it's a simple URL path (not JSON), return it directly
  if (!raw.startsWith('{')) return raw;
  return null;
}

export function clearRedirectIntent(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${REDIRECT_INTENT_COOKIE}=; Path=/; Max-Age=0`;
}

export function saveIntent(kind: IntentKind, payload: any): void {
  const intent: Intent = { kind, payload, createdAt: Date.now() };
  writeCookie(JSON.stringify(intent), TTL_MS / 1000);
}

export function getIntent(): Intent | null {
  const raw = readCookie();
  if (!raw) return null;
  if (!raw.startsWith('{')) return null;
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

export function clearIntent(): void {
  clearRedirectIntent();
}
