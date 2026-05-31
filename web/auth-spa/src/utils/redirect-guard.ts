const REDIRECT_PATH_MAX_LENGTH = 256;

/** Safely extracts and validates a redirect path from search params. */
export function extractSafeRedirectPath(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('redirectToPath');
  if (!raw || raw.trim() === '') return null;

  const path = raw.trim();
  if (path.length > REDIRECT_PATH_MAX_LENGTH) return null;
  if (path.includes('\\') || /[\r\n\t]/.test(path)) return null;
  if (path.includes('://') || path.startsWith('//')) return null;
  if (!path.startsWith('/')) return null;

  try {
    const parsed = new URL(path, globalThis.location.origin);
    if (parsed.origin !== globalThis.location.origin) return null;
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (normalized.length > REDIRECT_PATH_MAX_LENGTH) return null;
    if (normalized.startsWith('//')) return null;
    return normalized;
  } catch {
    return null;
  }
}
