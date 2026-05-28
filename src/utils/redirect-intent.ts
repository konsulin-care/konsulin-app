const REDIRECT_INTENT_COOKIE = 'redirect_intent';

export function getRedirectIntent(): string | null {
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

export function clearRedirectIntent(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${REDIRECT_INTENT_COOKIE}=; Path=/; Max-Age=0`;
}
