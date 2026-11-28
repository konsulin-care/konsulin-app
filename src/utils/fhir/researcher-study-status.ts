import type { ResearchStudy } from 'fhir/r4';
import type { ResearchBatch } from './research';
import { readFindings } from './study-findings';

/** The status of one researcher study, as shown on the study card chip. */
export type ResearcherStudyStatus =
  | { kind: 'finding-due'; batchIndex: number }
  | { kind: 'open'; closesOn: string }
  | { kind: 'upcoming'; opensOn: string }
  | { kind: 'finished' };

/**
 * Derives the status of one researcher study; first match wins.
 *
 * A batch whose window ended before today and that has no finding posted after
 * its end makes the study `finding-due`. Otherwise an ongoing batch wins, then
 * a future batch, then `finished`. The `finding-due` rule mirrors
 * `nextResearcherStep`.
 *
 * @param study - The ResearchStudy, whose notes hold the posted findings.
 * @param batches - The study batches.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns The study status.
 */
export function researcherStudyStatus(
  study: ResearchStudy,
  batches: readonly ResearchBatch[],
  today: string
): ResearcherStudyStatus {
  const times = readFindings(study).map(f => f.time.slice(0, 10));
  const batchIndex = batches.findIndex(
    b => b.end < today && !times.some(t => t > b.end)
  );
  if (batchIndex !== -1) return { kind: 'finding-due', batchIndex };

  const open = batches
    .filter(b => b.start <= today && today <= b.end)
    .toSorted((a, b) => a.end.localeCompare(b.end))[0];
  if (open) return { kind: 'open', closesOn: open.end };

  const next = batches
    .filter(b => b.start > today)
    .toSorted((a, b) => a.start.localeCompare(b.start))[0];
  if (next) return { kind: 'upcoming', opensOn: next.start };

  return { kind: 'finished' };
}
