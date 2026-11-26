import type { StudyProgress } from '@/utils/fhir/research';
import { readStudyProfile } from '@/utils/fhir/study-profile';

/** Run-by choice for the study catalogue filter. */
export type StudyRunBy = 'all' | 'konsulin' | 'other';

/** Kind choice for the study catalogue filter. */
export type StudyKindFilter = 'all' | 'one-time' | 'repeated';

/** Filter values applied to a study catalogue. */
export interface StudyFilter {
  /** Free text matched against title, research question and group. */
  query: string;
  /** Restrict to Konsulin studies, other groups, or both. */
  runBy: StudyRunBy;
  /** Restrict to one-time or repeated studies, or both. */
  kind: StudyKindFilter;
  /** Configured Konsulin organization id; empty treats unsponsored studies as Konsulin. */
  konsulinOrganizationId?: string;
}

/**
 * Collects the searchable text of a study in lower case.
 * @param item - study progress entry
 * @returns lower-cased title, research question and group name
 */
function searchableText(item: StudyProgress): string[] {
  return [
    item.study.title ?? '',
    item.study.objective?.[0]?.name ?? '',
    item.study.sponsor?.display ?? ''
  ].map(text => text.toLowerCase());
}

/**
 * Checks whether a study matches the free-text query.
 * @param item - study progress entry
 * @param query - trimmed, lower-cased query
 * @returns true when any searchable field contains the query
 */
function matchesQuery(item: StudyProgress, query: string): boolean {
  if (query === '') return true;
  return searchableText(item).some(text => text.includes(query));
}

/**
 * Checks whether a study matches the run-by choice.
 * @param item - study progress entry
 * @param runBy - run-by choice
 * @param konsulinOrganizationId - configured Konsulin organization id
 * @returns true when the run-by choice admits the study
 */
function matchesRunBy(
  item: StudyProgress,
  runBy: StudyRunBy,
  konsulinOrganizationId: string
): boolean {
  if (runBy === 'all') return true;
  const { isKonsulin } = readStudyProfile(item.study, konsulinOrganizationId);
  return runBy === 'konsulin' ? isKonsulin : !isKonsulin;
}

/**
 * Checks whether a study matches the kind choice.
 * @param item - study progress entry
 * @param kind - kind choice
 * @returns true when the kind choice admits the study
 */
function matchesKind(item: StudyProgress, kind: StudyKindFilter): boolean {
  if (kind === 'all') return true;
  const isOneTime = item.batches.length <= 1;
  return kind === 'one-time' ? isOneTime : !isOneTime;
}

/**
 * Filter the study catalogue by text, run-by and kind.
 * @param items - study progress entries to filter
 * @param filter - query, run-by, kind and optional Konsulin organization id
 * @returns new array with the studies that match every filter
 */
export function filterStudies(
  items: StudyProgress[],
  filter: StudyFilter
): StudyProgress[] {
  const query = filter.query.trim().toLowerCase();
  const konsulinOrganizationId = filter.konsulinOrganizationId ?? '';
  return items.filter(
    item =>
      matchesQuery(item, query) &&
      matchesRunBy(item, filter.runBy, konsulinOrganizationId) &&
      matchesKind(item, filter.kind)
  );
}
