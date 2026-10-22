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
