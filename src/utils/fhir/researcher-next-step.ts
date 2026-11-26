import type { ResearchStudy } from 'fhir/r4';
import type { ResearchBatch } from './research';
import { readFindings } from './study-findings';

/** A researcher study with its batches. */
export interface ResearcherStudy {
  study: ResearchStudy;
  batches: readonly ResearchBatch[];
}

/** The single next step suggested on the researcher home. */
export type ResearcherNextStep =
  | { kind: 'register' }
  | { kind: 'share'; study: ResearchStudy; batchIndex: number }
  | { kind: 'open'; closesOn: string }
  | { kind: 'upcoming'; opensOn: string }
  | { kind: 'all-closed' };

/**
 * Picks the next step for a researcher; first match wins.
 *
 * @param studies - Studies with their batches.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns The next step.
 */
export function nextResearcherStep(
  studies: readonly ResearcherStudy[],
  today: string
): ResearcherNextStep {
  if (studies.length === 0) return { kind: 'register' };
  for (const { study, batches } of studies) {
    const times = readFindings(study).map(f => f.time.slice(0, 10));
    const batchIndex = batches.findIndex(
      b => b.end < today && !times.some(t => t > b.end)
    );
    if (batchIndex !== -1) return { kind: 'share', study, batchIndex };
  }
  const all = studies.flatMap(s => s.batches);
  const open = all
    .filter(b => b.start <= today && today <= b.end)
    .toSorted((a, b) => a.end.localeCompare(b.end))[0];
  if (open) return { kind: 'open', closesOn: open.end };
  const next = all
    .filter(b => b.start > today)
    .toSorted((a, b) => a.start.localeCompare(b.start))[0];
  if (next) return { kind: 'upcoming', opensOn: next.start };
  return { kind: 'all-closed' };
}
