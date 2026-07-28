'use client';

import { RotateCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Error boundary for the /assessments segment. Catches chunk failures and shows retry UI. */
export default function AssessmentsError({ error, reset }: ErrorProps) {
  return (
    <div className='container flex flex-col items-center px-4 pt-32'>
      <h2 className='text-center text-2xl font-semibold'>
        Something went wrong
      </h2>
      <p className='mt-2 text-center text-sm opacity-50'>
        The page failed to load. This can happen on unstable connections.
      </p>

      <button
        type='button'
        onClick={reset}
        className='mt-8 flex cursor-pointer items-center gap-2'
      >
        <span className='text-2xl font-semibold underline'>Try again</span>
        <RotateCw width={21} height={21} />
      </button>

      {process.env.NODE_ENV === 'development' && (
        <pre className='mt-8 max-w-full overflow-auto rounded-lg bg-gray-100 p-4 text-xs'>
          {error.name}: {error.message}
        </pre>
      )}
    </div>
  );
}
