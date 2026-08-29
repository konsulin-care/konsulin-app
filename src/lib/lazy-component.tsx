import LoadingSection from '@/components/general/loading-section';
import dynamic from 'next/dynamic';
import type { ComponentType, JSX } from 'react';

interface LazyOptions {
  /** Whether to SSR the component. Sections default to true, interactive-heavy defaults to false. */
  ssr?: boolean;
  /** Custom loading fallback. Defaults to LoadingSection skeleton. */
  fallback?: JSX.Element;
}

/** Webpack chunk error has a `request` property with the chunk URL. */
interface ChunkError extends Error {
  request?: string;
}

/**
 * Extracts the chunk source URL from a chunk load error.
 * Prefers the `.request` property (webpack) before falling back to regex.
 */
function getChunkSrc(error: ChunkError): string | null {
  if (error.request) return error.request;

  // Match: "Loading chunk x failed.\n(errorType: URL)"
  const matches = /:\s+(\S+)\)/.exec(error.message);
  return matches?.[1] ?? null;
}

/**
 * Wraps a dynamic import loader with retry logic for chunk load failures.
 *
 * Retries up to 3 times with exponential backoff. On each retry, forces browser
 * cache revalidation so a corrupted chunk from an unstable connection doesn't
 * get served again.
 *
 * Non-chunk errors (e.g., 404, auth failures) propagate immediately without retry.
 *
 * @param loader - Original dynamic import loader
 * @returns Wrapped loader with retry behavior
 */
export function withChunkRetry<T>(
  loader: () => Promise<{ default: ComponentType<T> }>
): () => Promise<{ default: ComponentType<T> }> {
  const MAX_RETRIES = 3;

  return async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await loader();
      } catch (err) {
        const error = err as ChunkError;
        const isChunkError =
          error.name === 'ChunkLoadError' ||
          error.message?.includes('Loading chunk');

        if (!isChunkError || attempt === MAX_RETRIES) {
          throw err;
        }

        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve =>
          setTimeout(resolve, 1000 * 2 ** (attempt - 1))
        );

        // Best-effort cache revalidation for the failed chunk URL
        // skipcq: JS-0098 - fire-and-forget cache revalidation
        void tryRevalidateChunkCache(error);
      }
    }
    throw new Error('Unreachable');
  };
}

/**
 * Forces browser cache revalidation for a failed chunk.
 *
 * Uses `fetch` with `cache: 'reload'` to update the HTTP cache entry,
 * and appends a cache-busting `<link rel="preload">` to pre-warm the
 * fresh response. This is best-effort — the retry works without it.
 */
async function tryRevalidateChunkCache(error: ChunkError): Promise<void> {
  try {
    const src = getChunkSrc(error);
    if (!src) return;

    // Forces HTTP cache revalidation (fire-and-forget)
    await fetch(src, { cache: 'reload', mode: 'no-cors' });

    // Preload with cache busting to warm fresh content
    const separator = src.includes('?') ? '&' : '?';
    const bustedUrl = `${src}${separator}_t=${String(Date.now())}`;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = bustedUrl;
    document.head.append(link);
    setTimeout(() => link.remove(), 10_000);
  } catch {
    // Best effort — the retry mechanism works without cache revalidation
  }
}

/**
 * Safely extracts the actual default export from a dynamically imported module,
 * handling CJS/ESM interop where webpack wraps CJS `module.exports` in a nested
 * `{ default: { default: Component } }` structure.
 *
 * Priority: `mod.default?.default` → `mod.default` → `mod`.
 *
 * @param mod - The resolved module object from `import()`.
 * @returns The actual component or value.
 */
export function resolveCjsDefaultExport(mod: unknown): unknown {
  if (!mod) return mod;
  const defaultExport = (mod as Record<string, unknown>).default;
  if (
    defaultExport &&
    typeof defaultExport === 'object' &&
    'default' in (defaultExport as Record<string, unknown>)
  ) {
    return (defaultExport as Record<string, unknown>).default;
  }
  return defaultExport === undefined ? mod : defaultExport;
}

/**
 * Typed wrapper around `next/dynamic` with chunk retry and consistent skeleton.
 *
 * Automatically retries chunk loading up to 3 times when a chunk fails to load
 * (e.g., due to unstable connection causing truncated download). Uses exponential
 * backoff and browser cache revalidation between retries.
 *
 * Sections visible on page load should use `ssr: true` (default) so HTML renders
 * statically. Components behind user interaction should use `ssr: false`.
 *
 * @example
 * ```tsx
 * const HeavySection = lazyComponent(() => import('./heavy-section'));
 * const DrawerContent = lazyComponent(() => import('./drawer-content'), { ssr: false });
 * ```
 */
export function lazyComponent<T>(
  loader: () => Promise<{ default: ComponentType<T> }>,
  options?: LazyOptions
): ComponentType<T> {
  return dynamic(() => withChunkRetry(loader)(), {
    ssr: options?.ssr ?? true,
    loading: () => options?.fallback ?? <LoadingSection />
  });
}
