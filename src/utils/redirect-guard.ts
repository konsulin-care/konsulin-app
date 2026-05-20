const REDIRECT_PATH_MAX_LENGTH = 256;

/**
 * Extracts and validates the `redirectToPath` query parameter from a URL search string.
 *
 * Enforces strict internal-only rules:
 * - Must start with "/" (relative path only)
 * - Must not start with "//" (protocol-relative URL)
 * - Must not contain "://" (absolute URL with any scheme)
 * - Must not exceed 256 characters
 *
 * Returns the safe path string, or null if the value is absent, empty, or fails any rule.
 * All rejections are logged for debugging.
 */
export function extractSafeRedirectPath(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('redirectToPath');

  if (!raw || raw.trim() === '') {
    return null;
  }

  const path = raw.trim();

  if (path.length > REDIRECT_PATH_MAX_LENGTH) {
    console.warn(
      `[auth:redirect] redirectToPath rejected: exceeds max length of ${REDIRECT_PATH_MAX_LENGTH} characters`
    );
    return null;
  }

  if (path.includes('\\')) {
    console.warn(
      '[auth:redirect] redirectToPath rejected: backslashes are not allowed',
      path
    );
    return null;
  }

  if (/[\r\n\t]/.test(path)) {
    console.warn(
      '[auth:redirect] redirectToPath rejected: control whitespace is not allowed',
      path
    );
    return null;
  }

  if (path.includes('://')) {
    console.warn(
      '[auth:redirect] redirectToPath rejected: contains a URL scheme',
      path
    );
    return null;
  }

  if (path.startsWith('//')) {
    console.warn(
      '[auth:redirect] redirectToPath rejected: protocol-relative URL not allowed',
      path
    );
    return null;
  }

  if (!path.startsWith('/')) {
    console.warn(
      '[auth:redirect] redirectToPath rejected: must be a relative path starting with /',
      path
    );
    return null;
  }

  try {
    const parsed = new URL(path, globalThis.location.origin);
    if (parsed.origin !== globalThis.location.origin) {
      console.warn(
        '[auth:redirect] redirectToPath rejected: cross-origin redirect is not allowed',
        path
      );
      return null;
    }

    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (normalized.length > REDIRECT_PATH_MAX_LENGTH) {
      console.warn(
        `[auth:redirect] redirectToPath rejected after normalization: exceeds max length of ${REDIRECT_PATH_MAX_LENGTH} characters`
      );
      return null;
    }

    if (normalized.startsWith('//')) {
      console.warn(
        '[auth:redirect] redirectToPath rejected after normalization: protocol-relative URL not allowed',
        normalized
      );
      return null;
    }

    const decoded = decodeURIComponent(normalized);
    if (decoded.startsWith('//')) {
      console.warn(
        '[auth:redirect] redirectToPath rejected: decodes to protocol-relative URL',
        normalized
      );
      return null;
    }

    return normalized;
  } catch {
    console.warn(
      '[auth:redirect] redirectToPath rejected: URL parsing failed',
      path
    );
    return null;
  }
}
