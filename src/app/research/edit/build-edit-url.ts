import type { ReadonlyURLSearchParams } from 'next/navigation';

type Page = 'title' | 'questionnaire' | 'batch';

/**
 * Build an edit URL preserving the current `id` search param.
 *
 * @param searchParams - Current URL search params
 * @param page - Target page to navigate to
 * @returns The /research/edit URL with id (if present) and page params
 */
export function buildEditUrl(
  searchParams: ReadonlyURLSearchParams,
  page: Page
): string {
  const id = searchParams.get('id');
  const qs = id ? `id=${id}&page=${page}` : `page=${page}`;
  return `/research/edit?${qs}`;
}
