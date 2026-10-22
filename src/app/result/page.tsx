'use client';

import { Suspense } from 'react';
import ResultView from './result-view';

/**
 * Result page — wraps ResultView in Suspense for useSearchParams.
 */
export default function ResultPage() {
  return (
    <Suspense fallback={null}>
      <ResultView />
    </Suspense>
  );
}
