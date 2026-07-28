import LoadingSection from '@/components/general/loading-section';
import dynamic from 'next/dynamic';
import type { ComponentType, JSX } from 'react';

interface LazyOptions {
  /** Whether to SSR the component. Sections default to true, interactive-heavy defaults to false. */
  ssr?: boolean;
  /** Custom loading fallback. Defaults to LoadingSection skeleton. */
  fallback?: JSX.Element;
}

/**
 * Typed wrapper around `next/dynamic` with a consistent loading skeleton.
 *
 * Sections visible on page load should use `ssr: true` (default) so HTML
 * renders statically. Components behind user interaction should use `ssr: false`.
 *
 * @example
 * ```ts
 * const HeavySection = lazyComponent(() => import('./heavy-section'));
 * const DrawerContent = lazyComponent(() => import('./drawer-content'), { ssr: false });
 * ```
 */
export function lazyComponent<T>(
  loader: () => Promise<{ default: ComponentType<T> }>,
  options?: LazyOptions
): ComponentType<T> {
  return dynamic(loader, {
    ssr: options?.ssr ?? true,
    loading: () => options?.fallback ?? <LoadingSection />
  });
}
