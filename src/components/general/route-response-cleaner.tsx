'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function RouteResponseCleaner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const keys = Object.keys(localStorage);
    const responseKey = keys.find(key => key.startsWith('response_'));
    const isSkipCleanup =
      localStorage.getItem('skip-response-cleanup') === 'true';

    if (!responseKey) return;

    const segments = pathname.split('/');
    const isRecordPage = segments[1] === 'record';
    const recordId = isRecordPage ? segments[2] : null;
    const typeParam = searchParams.get('type');
    const questionnaireId = responseKey.replace('response_', '');

    const isOnQuestionnairePage = pathname.includes(
      `/assessments/${questionnaireId}`
    );
    const isOnAuthPage = pathname.includes('/auth');
    const isOnResultPage =
      pathname.includes(`/record/${recordId}`) && typeParam === '1';

    /*
     * make sure the user is on one of these 3 routes.
     * if not, remove the questionnaire response.
     * */
    if (
      !isOnQuestionnairePage &&
      !isOnResultPage &&
      !isOnAuthPage &&
      !isSkipCleanup
    ) {
      localStorage.removeItem(responseKey);
    }
  }, [pathname]);

  return null;
}
