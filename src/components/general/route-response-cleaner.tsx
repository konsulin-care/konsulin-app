'use client';

import { STORES, dbGet, cursorDeleteAll } from '@/lib/indexeddb';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function RouteResponseCleaner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const saved = await dbGet<{ value: string }>(
        STORES.uiPreferences,
        ['', 'skip-response-cleanup']
      ).catch((err) => {
        console.warn('[IndexedDB]', err);
        return null;
      });
      if (cancelled) return;
      const isSkipCleanup = saved?.value === 'true';

      const categoryParam = searchParams.get('category');

      cursorDeleteAll(
        STORES.assessmentDrafts,
        (value: any, key: IDBValidKey) => {
          const questionnaireId =
            Array.isArray(key) ? key[1] : '';
          const segments = pathname.split('/');
          const isRecordPage = segments[1] === 'record';
          const recordId = isRecordPage ? segments[2] : null;
          const isOnQuestionnairePage = pathname.includes(
            `/assessments/${questionnaireId}`
          );
          const isOnAuthPage = pathname.includes('/auth');
          const isOnResultPage =
            pathname.includes(`/record/${recordId}`) && categoryParam === '1';

          return (
            !isOnQuestionnairePage &&
            !isOnResultPage &&
            !isOnAuthPage &&
            !isSkipCleanup
          );
        }
      ).catch((err) => console.warn('[IndexedDB]', err));

      const isOnSoapPage =
        /^\/record\/[^/]+\/edit/.test(pathname) ||
        pathname.includes('/assessments/soap');

      if (!isOnSoapPage) {
        cursorDeleteAll(STORES.soapDrafts, () => true)
          .catch((err) => console.warn('[IndexedDB]', err));
      }
    })();

    return () => { cancelled = true; };
  }, [pathname, searchParams]);

  return null;
}
