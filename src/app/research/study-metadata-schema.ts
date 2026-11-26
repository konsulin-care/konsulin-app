import { readStudyProfile } from '@/utils/fhir/study-profile';
import type { ResearchStudy } from 'fhir/r4';
import { z } from 'zod';

/** Ethics codes accepted by the study metadata form. */
export const ETHICS_STATUSES = ['applying', 'approved', 'exempt'] as const;

/**
 * Validation shape shared by the register and edit study metadata step.
 * The research question is trimmed and must not be empty.
 */
export const studyMetadataShape = z.object({
  researchQuestion: z
    .string()
    .trim()
    .min(1, { message: 'research_question_required' }),
  whoCanJoin: z.string().optional(),
  ethicsStatus: z.enum(ETHICS_STATUSES),
  ethicsReference: z.string().optional(),
  sharesFindings: z.boolean().default(false)
});

/** Form values for the study metadata step. */
export type StudyMetadataFormValues = z.input<typeof studyMetadataShape>;

/**
 * Map a stored study back to study metadata form values.
 * @param study - the stored ResearchStudy
 * @returns form values, defaulting ethics to applying when not stated
 */
export function metadataFromStudy(
  study: ResearchStudy
): StudyMetadataFormValues {
  const profile = readStudyProfile(study, '');
  return {
    researchQuestion: profile.question ?? '',
    whoCanJoin: profile.whoCanJoin,
    ethicsStatus: profile.ethics === 'not-stated' ? 'applying' : profile.ethics,
    ethicsReference: profile.ethicsReference,
    sharesFindings: profile.sharesFindings
  };
}
