import type { Annotation, ResearchStudy } from 'fhir/r4';
import { FhirExtensionUrls } from './extensions';

/** Input for a new finding. */
export interface NewFinding {
  text: string;
  time: string;
  authorReference: string;
  authorDisplay?: string;
  participantCount?: number;
}

/** A finding read back from a study note. */
export interface StudyFinding {
  text: string;
  time: string;
  authorName?: string;
  participantCount?: number;
}

/**
 * Append a finding note to a study, keeping existing notes.
 *
 * @param study - The ResearchStudy
 * @param finding - Finding text, time, author and participant count
 * @returns A new ResearchStudy with the note added
 */
export function appendFinding(
  study: ResearchStudy,
  finding: NewFinding
): ResearchStudy {
  const note: Annotation = {
    text: finding.text,
    time: finding.time,
    authorReference: {
      reference: finding.authorReference,
      display: finding.authorDisplay
    }
  };
  if (finding.participantCount !== undefined) {
    note.extension = [
      {
        url: FhirExtensionUrls.findingParticipantCount,
        valueInteger: finding.participantCount
      }
    ];
  }
  return { ...study, note: [...(study.note ?? []), note] };
}

/**
 * Read findings from a study, newest first.
 *
 * @param study - The ResearchStudy
 * @returns Findings sorted by time descending
 */
export function readFindings(study: ResearchStudy): StudyFinding[] {
  const notes = study.note ?? [];
  return notes
    .map(n => ({
      text: n.text,
      time: n.time ?? '',
      authorName: n.authorReference?.display,
      participantCount: n.extension?.find(
        e => e.url === FhirExtensionUrls.findingParticipantCount
      )?.valueInteger
    }))
    .toSorted((a, b) => Date.parse(b.time) - Date.parse(a.time));
}
