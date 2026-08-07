import type { StudyProgress } from '@/utils/fhir/research';

/**
 * Rebuilds the /research URL from the given search params, applying updates
 * in canonical id → view → ref order. A null value removes the key;
 * undefined preserves it. Used so URL rewrites only touch what changed.
 *
 * @param searchParams - Current search params to derive values from.
 * @param updates - Keys to set (string) or remove (null); omitted keys keep
 * their current value.
 * @returns The /research URL with the updated query, or '/research' when empty.
 */
export function updateResearchUrl(
  searchParams: { get(key: string): string | null },
  updates: { id?: string | null; view?: string | null; ref?: string | null }
): string {
  const next = new URLSearchParams();
  const id = updates.id === undefined ? searchParams.get('id') : updates.id;
  const view =
    updates.view === undefined ? searchParams.get('view') : updates.view;
  const ref = updates.ref === undefined ? searchParams.get('ref') : updates.ref;
  if (id) next.set('id', id);
  if (view) next.set('view', view);
  if (ref) next.set('ref', ref);
  const query = next.toString();
  return query ? `/research?${query}` : '/research';
}

/**
 * Resolves the `?id=` and `?view=` deep-link params against the known
 * studies. Unknown ids resolve to undefined so callers can clean the URL.
 *
 * @param searchParams - Current search params to read `id` and `view` from.
 * @param studies - Known studies the params are resolved against.
 * @returns The known study for each present param, or undefined.
 */
export function resolveDeepLinks(
  searchParams: { get(key: string): string | null },
  studies: StudyProgress[]
): { knownId?: StudyProgress; knownView?: StudyProgress } {
  const requestedId = searchParams.get('id');
  const requestedView = searchParams.get('view');
  return {
    knownId: requestedId
      ? studies.find(study => study.study.id === requestedId)
      : undefined,
    knownView: requestedView
      ? studies.find(study => study.study.id === requestedView)
      : undefined
  };
}

/**
 * Resolves the carousel slide to focus: a valid `id` wins, then a valid
 * `view`, then the current slide, then the first study.
 *
 * @param knownId - Study resolved from `?id=`, or undefined.
 * @param knownView - Study resolved from `?view=`, or undefined.
 * @param activeStudyId - Currently focused slide, or null.
 * @param studies - Known studies to fall back to.
 * @returns The study id to focus, or null when no studies exist.
 */
export function resolveFocusTarget(
  knownId: StudyProgress | undefined,
  knownView: StudyProgress | undefined,
  activeStudyId: string | null,
  studies: StudyProgress[]
): string | null {
  if (knownId) return knownId.study.id;
  if (knownView) return knownView.study.id;
  if (
    activeStudyId &&
    studies.some(study => study.study.id === activeStudyId)
  ) {
    return activeStudyId;
  }
  return studies[0]?.study.id ?? null;
}
