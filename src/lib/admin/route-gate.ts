/**
 * Route-selection predicate for the /admin route gate. The gate lets the root
 * layout render a minimal admin shell (no SuperTokens, no AppChrome) when the
 * current path lives under /admin.
 */

/**
 * Returns true when the given pathname is inside the /admin subtree.
 *
 * @param pathname - current URL pathname from usePathname()
 * @returns true for /admin, /admin/, /admin/<anything>
 */
export function isAdminPath(pathname: string | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/admin') return true;
  return pathname.startsWith('/admin/');
}

/** Routes that render without the app navigation shell. */
const BARE_SHELL_PREFIXES = [
  '/auth',
  '/logout',
  '/remove-account',
  '/unauthorized',
  '/~offline'
] as const;

/**
 * Returns true when the given pathname renders without the app navigation
 * shell (auth flows, logout, account removal, unauthorized, offline fallback).
 *
 * @param pathname - current URL pathname from usePathname()
 * @returns true for a bare root or any `/`-nested path below it
 */
export function isBareShellPath(pathname: string | undefined): boolean {
  if (!pathname) return false;
  return BARE_SHELL_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
