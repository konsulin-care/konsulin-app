import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Replaces the current URL with the study page for legacy deep links.
 */
export function useLegacyStudyRedirect(): void {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  useEffect(() => {
    const target = legacyStudyRedirect(pathname, searchParams);
    if (target) router.replace(target);
  }, [pathname, searchParams, router]);
}

/**
 * Maps a legacy `?id=` or `?view=` deep link on `/` or `/research` to the
 * study page, keeping the referral `ref` parameter.
 *
 * @param pathname Current pathname.
 * @param searchParams Current query parameters.
 * @returns The `/study?id=X` target, or null when no redirect applies.
 */
export function legacyStudyRedirect(
  pathname: string,
  searchParams: URLSearchParams
): string | null {
  if (pathname !== '/' && pathname !== '/research') return null;
  const studyId = searchParams.get('id') || searchParams.get('view');
  if (!studyId) return null;
  const next = new URLSearchParams({ id: studyId });
  const ref = searchParams.get('ref');
  if (ref) next.set('ref', ref);
  return `/study?${next.toString()}`;
}
