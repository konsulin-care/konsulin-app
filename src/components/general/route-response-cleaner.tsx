'use client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import { STORES, cursorDeleteAll, dbGet } from '@/lib/indexeddb';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 *
 */
export default function RouteResponseCleaner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      const saved = await dbGet<{ value: string }>(STORES.uiPreferences, [
        '',
        'skip-response-cleanup'
      ]).catch((err: unknown) => {
        console.warn('[IndexedDB]', err);
        return null;
      });
      if (cancelled) return;
      const isSkipCleanup = saved?.value === 'true';

      const categoryParam = searchParams.get('category');

      cursorDeleteAll(
        STORES.assessmentDrafts,
        (value: unknown, key: IDBValidKey) => {
          const questionnaireId = Array.isArray(key) ? key[1] : '';
          const id = searchParams.get('id');
          const isOnQuestionnairePage =
            pathname === '/assessments' && id === questionnaireId;
          const isOnAuthPage = pathname.includes('/auth');
          const isOnResultPage =
            pathname === '/record' && id && categoryParam === '1';
          const isOnReportPage = pathname === '/report';

          return (
            !isOnQuestionnairePage &&
            !isOnResultPage &&
            !isOnReportPage &&
            !isOnAuthPage &&
            !isSkipCleanup
          );
        }
      ).catch((err: unknown) => console.warn('[IndexedDB]', err));

      const isOnSoapPage =
        pathname === '/record/edit' || pathname === '/assessments/soap';
      const isOnAuthPage = pathname.includes('/auth');

      if (!isOnSoapPage && !isOnAuthPage) {
        cursorDeleteAll(STORES.soapDrafts, () => true).catch((err: unknown) =>
          console.warn('[IndexedDB]', err)
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams]);

  return null;
}
