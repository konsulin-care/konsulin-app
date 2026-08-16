/**
 * Deterministic triage screening resolver.
 *
 * Maps the coded answer of the one-question screening (seeded as
 * `Questionnaire/triage-screening`) to the specialty code accepted by
 * `/api/recommendations?specialty=…`. No AI — pure constant mapping aligned
 * with the seeded answer options and practitioner role specialty codes.
 */

export interface ScreeningAnswer {
  /** Answer option code (matches the seeded AnswerOption coding code). */
  code: string;
  /** User-facing label. */
  label: string;
  /** Specialty code passed to the recommendations BFF. */
  specialty: string;
}

export const SCREENING_QUESTION = 'Apa keluhan utama Anda hari ini?';

const SCREENING_ANSWERS: ScreeningAnswer[] = [
  {
    code: 'anxiety',
    label: 'Cemas, stres, atau merasa kewalahan secara emosional',
    specialty: 'psychology'
  },
  {
    code: 'mood',
    label: 'Mood rendah / depresi yang berkepanjangan',
    specialty: 'psychiatry'
  },
  {
    code: 'child',
    label: 'Kebutuhan tumbuh kembang atau perilaku anak',
    specialty: 'pediatrics'
  },
  {
    code: 'cognitive',
    label: 'Kesulitan mengingat atau berkonsentrasi',
    specialty: 'neuropsychology'
  },
  {
    code: 'general',
    label: 'Keluhan kesehatan umum',
    specialty: 'general-practice'
  },
  {
    code: 'heart',
    label: 'Nyeri dada atau keluhan jantung',
    specialty: 'cardiology'
  },
  { code: 'skin', label: 'Masalah kulit', specialty: 'dermatology' },
  {
    code: 'metabolic',
    label: 'Gula darah atau gangguan tiroid',
    specialty: 'endocrinology'
  },
  { code: 'women', label: 'Kesehatan wanita / kehamilan', specialty: 'obgyn' },
  { code: 'bone', label: 'Nyeri tulang atau sendi', specialty: 'orthopedics' },
  {
    code: 'ear',
    label: 'Keluhan telinga, hidung, atau tenggorokan',
    specialty: 'ent'
  },
  {
    code: 'eye',
    label: 'Gangguan penglihatan',
    specialty: 'ophthalmology'
  }
];

const SPECIALTY_BY_CODE: Record<string, string> = Object.fromEntries(
  SCREENING_ANSWERS.map(a => [a.code, a.specialty])
);

/** Returns the screening answer options in seeded order. */
export function getScreeningAnswers(): ScreeningAnswer[] {
  return SCREENING_ANSWERS;
}

/**
 * Resolve the specialty code for a selected screening answer.
 *
 * @param code - The answer option code, or null/undefined before selection
 * @returns The specialty code, or null when unknown
 */
export function resolveSpecialtyFromAnswer(
  code: string | null | undefined
): string | null {
  if (!code) return null;
  return SPECIALTY_BY_CODE[code] ?? null;
}
