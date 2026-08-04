'use client';

import { RotateCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Webpack chunk error may have a `request` property with the chunk URL. */
interface ChunkError extends Error {
  request?: string;
}

/**
 * Extracts the chunk source URL from a chunk load error.
 * Prefers `.request` (webpack) before falling back to regex.
 */
function getChunkSrc(error: ChunkError): string | null {
  if (error.request) return error.request;

  // Match: "Loading chunk x failed.\n(errorType: URL)"
  const matches = /:\s+(\S+)\)/.exec(error.message);
  return matches?.[1] ?? null;
}

/** Returns true if the error is a webpack chunk load failure. */
function isChunkError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk')
  );
}

/**
 * Attempts cache revalidation for a failed chunk URL.
 * Best-effort: uses fetch with cache: 'reload' to force a fresh download.
 */
async function revalidateChunkCache(error: ChunkError): Promise<void> {
  try {
    const src = getChunkSrc(error);
    if (!src) return;

    // Forces HTTP cache revalidation (fire-and-forget)
    await fetch(src, { cache: 'reload', mode: 'no-cors' });
  } catch (err) {
    console.info('Chunk cache revalidation failed (best effort)', err);
  }
}

/** Removes stale script tags for the failed chunk to force re-fetch. */
function tryRemoveStaleScripts(error: ChunkError): void {
  try {
    const src = getChunkSrc(error);
    if (!src) return;

    const scriptUrl = src.split('?')[0];

    // Iterate over matching script tags by URL prefix
    document.querySelectorAll<HTMLScriptElement>('script').forEach(s => {
      if (s.src.startsWith(scriptUrl)) s.remove();
    });
  } catch (err) {
    console.info('Failed to remove stale chunk scripts (best effort)', err);
  }
}

/** Error boundary for the /assessments segment. Catches chunk failures and shows retry UI. */
export default function AssessmentsError({
  error,
  reset
}: Readonly<ErrorProps>) {
  const chunkError = isChunkError(error);
  const chunkErr = error as ChunkError;

  /** Retries chunk loading and resets the error boundary. */
  const handleRetry = (): void => {
    if (chunkError) {
      tryRemoveStaleScripts(chunkErr);
      // deepsource:ignore JS-0098 — fire-and-forget chunk cache revalidation
      void revalidateChunkCache(chunkErr);
    }
    reset();
  };

  /** Reloads the page to recover from an unrecoverable error. */
  const handleReload = (): void => {
    window.location.reload();
  };

  return (
    <div className='container flex flex-col items-center px-4 pt-32'>
      <h2 className='text-center text-2xl font-semibold'>
        Something went wrong
      </h2>
      <p className='mt-2 text-center text-sm opacity-50'>
        {chunkError
          ? 'A component failed to load. This can happen on unstable connections.'
          : 'The page failed to load. This can happen on unstable connections.'}
      </p>

      <button
        type='button'
        onClick={handleRetry}
        className='mt-8 flex cursor-pointer items-center gap-2'
      >
        <span className='text-2xl font-semibold underline'>Try again</span>
        <RotateCw width={21} height={21} />
      </button>

      {chunkError && (
        <button
          type='button'
          onClick={handleReload}
          className='mt-4 flex cursor-pointer items-center gap-2 text-sm opacity-60 hover:opacity-100'
        >
          <span className='underline'>Reload page</span>
        </button>
      )}

      {process.env.NODE_ENV === 'development' && (
        <pre className='mt-8 max-w-full overflow-auto rounded-lg bg-gray-100 p-4 text-xs'>
          {error.name}: {error.message}
        </pre>
      )}
    </div>
  );
}
