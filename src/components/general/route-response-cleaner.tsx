'use client';

import { STORES, openDB } from '@/lib/indexeddb';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

async function cursorDeleteWhere(
  storeName: string,
  predicate: (value: any, key: IDBValidKey) => boolean
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  const req = store.openCursor();
  await new Promise<void>((resolve, reject) => {
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if (predicate(cursor.value, cursor.key)) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export default function RouteResponseCleaner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSkipCleanupRef = useRef(false);

  useEffect(() => {
    const dbRequest = indexedDB.open('konsulin');
    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      const tx = db.transaction(STORES.uiPreferences, 'readonly');
      const store = tx.objectStore(STORES.uiPreferences);
      const req = store.get(['', 'skip-response-cleanup']);
      req.onsuccess = () => {
        isSkipCleanupRef.current = req.result?.value === 'true';
      };
    };
  }, []);

  useEffect(() => {
    const isSkipCleanup = isSkipCleanupRef.current;
    const categoryParam = searchParams.get('category');

    // Clean assessment_drafts where user left the questionnaire page
    cursorDeleteWhere(
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
    );

    // Clean soap_drafts where user left the soap page
    const isOnSoapPage =
      /^\/record\/[^/]+\/edit/.test(pathname) ||
      pathname.includes('/assessments/soap');

    if (!isOnSoapPage) {
      cursorDeleteWhere(STORES.soapDrafts, () => true);
    }
  }, [pathname, searchParams]);

  return null;
}
