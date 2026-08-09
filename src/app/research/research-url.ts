import type { StudyProgress } from '@/utils/fhir/research';

/**
 * Rebuilds the /research URL from the given search params, applying updates
 * in canonical id → view → ref order. A null value removes the key;
 * undefined preserves it. Used so URL rewrites only touch what changed.
 * id and view are mutually exclusive; a non-null view always wins over id.
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
  // Explicit update wins, an explicit null removes the key, and an omitted
  // key falls back to the current param. `??` would collapse null into
  // undefined, breaking the remove-vs-preserve contract callers rely on.
  const resolve = (key: 'id' | 'view' | 'ref'): string | null => {
    const value = updates[key];
    if (value === undefined) {
      return searchParams.get(key);
    }
    return value;
  };
  const view = resolve('view');
  const id = resolve('id');
  const ref = resolve('ref');
  // Canonical form: `view` subsumes focus + drawer, so it always wins.
  if (view) {
    next.set('view', view);
  } else if (id) {
    next.set('id', id);
  }
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
 * Resolves the carousel slide to focus: a valid `view` wins, then a valid
 * `id`, then the current slide, then the first study.
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
  if (knownView) return knownView.study.id;
  if (knownId) return knownId.study.id;
  if (
    activeStudyId &&
    studies.some(study => study.study.id === activeStudyId)
  ) {
    return activeStudyId;
  }
  return studies[0]?.study.id ?? null;
}
