import type { QuestionnaireResponse, QuestionnaireResponseItem } from 'fhir/r4';

/** One parsed dimension score with raw value, fraction, and percentage. */
export interface ScoreDimension {
  /** linkId of the source score-dimension item. */
  linkId: string;
  name: string;
  /** Raw score divided by the instrument's reference max (0–1 fraction). */
  score: number;
  /** Rounded percentage of the reference max (0–100). */
  percentage: number;
  /** Raw integer score as recorded in the response. */
  raw: number;
  /** Instrument reference max used for normalization. */
  reference: number;
}

const BASE_HUE = 170;

/**
 * Deterministic HSL color derived from a score name.
 *
 * Pure function: hashes the name into stable hue/saturation/lightness so the
 * same score always renders the same color. No randomness, no state.
 *
 * @param name - Dimension name to hash.
 * @returns An hsl() color string.
 */
export function getScoreColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + (name.codePointAt(i) ?? 0)) >>> 0;
  }
  const hue = (BASE_HUE + (hash % 40) - 20 + 360) % 360;
  const saturation = 70 + (hash % 20);
  const lightness = 45 + (hash % 15);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/** Finds the score-dimension item inside a response's interpretation item. */
function scoreDimensionItemOf(
  questionnaireResponse: QuestionnaireResponse | null
): QuestionnaireResponseItem | undefined {
  const interpretationItem = (questionnaireResponse?.item ?? []).find(
    (item: QuestionnaireResponseItem) => item.linkId === 'interpretation'
  );
  return interpretationItem?.item?.find(
    (subItem: QuestionnaireResponseItem) => subItem.linkId === 'score-dimension'
  );
}

/** Resolves the reference max from a score-dimension item, defaulting to 1. */
function referenceValueOf(
  scoreDimensionItem: QuestionnaireResponseItem
): number {
  const reference = scoreDimensionItem.item?.find(
    (subItem: QuestionnaireResponseItem) => subItem.linkId === 'reference'
  );
  const refAnswer = reference?.answer?.[0];
  return refAnswer?.valueInteger ?? refAnswer?.valueDecimal ?? 1;
}

/** Builds one dimension from a sub-item, or undefined without a numeric answer. */
function dimensionFromItem(
  subItem: QuestionnaireResponseItem,
  refValue: number
): ScoreDimension | undefined {
  const answer = subItem.answer?.[0];
  const score = answer?.valueInteger ?? answer?.valueDecimal;
  if (score === undefined) return undefined;

  const newScore = score / refValue;
  return {
    linkId: subItem.linkId,
    name: subItem.text ?? 'Score',
    score: newScore,
    percentage: Math.round(newScore * 100),
    raw: score,
    reference: refValue
  };
}

/**
 * Parses the `score-dimension` interpretation items of a QuestionnaireResponse
 * into named score dimensions.
 *
 * The `reference` sub-item holds the instrument's max value and is excluded
 * from the result. Each remaining sub-item becomes a dimension with its raw
 * score normalized to a 0–1 fraction and a rounded percentage of the max.
 * Scores may be integers or decimals; a score of 0 is kept.
 * Items without a numeric answer are skipped. When the reference is zero or
 * negative, no dimensions are returned to avoid dividing by zero.
 *
 * @param questionnaireResponse - The response to parse, or null.
 * @returns Parsed dimensions in source order; empty when nothing to parse.
 */
export function parseDimensionScores(
  questionnaireResponse: QuestionnaireResponse | null
): ScoreDimension[] {
  const scoreDimensionItem = scoreDimensionItemOf(questionnaireResponse);
  if (!scoreDimensionItem) return [];

  const refValue = referenceValueOf(scoreDimensionItem);
  if (refValue <= 0) return [];

  const result: ScoreDimension[] = [];
  for (const subItem of scoreDimensionItem.item ?? []) {
    if (subItem.linkId === 'reference') continue;

    const dimension = dimensionFromItem(subItem, refValue);
    if (dimension) result.push(dimension);
  }
  return result;
}
