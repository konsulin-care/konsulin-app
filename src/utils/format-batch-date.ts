import { format, parseISO } from 'date-fns';
import { enUS, id } from 'date-fns/locale';

import type { Locale } from '@/lib/locale';

/**
 * Format an ISO date as a short, locale-aware batch label.
 *
 * @param isoDate ISO 8601 date string, e.g. `2026-12-01`.
 * @param locale Active UI locale; `id` uses Indonesian month names.
 * @returns Date formatted as `d MMM yyyy` in the requested locale.
 */
export function formatBatchDate(isoDate: string, locale: Locale): string {
  return format(parseISO(isoDate), 'd MMM yyyy', {
    locale: locale === 'id' ? id : enUS
  });
}
