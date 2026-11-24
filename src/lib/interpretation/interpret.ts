import type { QuestionnaireResponse, QuestionnaireResponseItem } from 'fhir/r4';
import type {
  InstrumentCoding,
  InstrumentDefinition,
  InstrumentRegistry,
  Interpretation,
  ScaleDefinition,
  ScaleReading
} from './types';

const INTERPRETATION_LINK_ID = 'interpretation';
const SCORE_DIMENSION_LINK_ID = 'score-dimension';
const SIGNAL_LINK_ID = 'signal';

/**
 * Find a nested item by linkId.
 *
 * @param items - Item list to search.
 * @param linkId - Link id to match.
 * @returns The matching item, or undefined.
 */
function findItem(
  items: readonly QuestionnaireResponseItem[] | undefined,
  linkId: string
): QuestionnaireResponseItem | undefined {
  return items?.find(item => item.linkId === linkId);
}

/**
 * Read the first numeric answer of an item.
 *
 * @param item - Item to read, may be undefined.
 * @returns The numeric value, or undefined when absent.
 */
function numericAnswer(
  item: QuestionnaireResponseItem | undefined
): number | undefined {
  const answer = item?.answer?.[0];
  if (!answer) return undefined;
  return answer.valueInteger ?? answer.valueDecimal ?? undefined;
}

/**
 * Select the band id for a value, honouring the scale range.
 *
 * Bands are ascending by inclusive lower bound; the last one at or below the
 * value wins. Values outside [min, max] get no band.
 *
 * @param scale - Scale the value belongs to.
 * @param value - Numeric score.
 * @returns The band id, or null.
 */
function bandFor(scale: ScaleDefinition, value: number): string | null {
  if (value < scale.min || value > scale.max) return null;
  let match: string | null = null;
  for (const band of scale.bands) {
    if (band.min <= value) match = band.id;
  }
  return match;
}

/**
 * Collect numeric scale values keyed by scale linkId.
 *
 * @param response - Response to read from.
 * @returns Map of linkId to value for present scales only.
 */
function readScaleValues(response: QuestionnaireResponse): Map<string, number> {
  const values = new Map<string, number>();
  const interpretation = findItem(response.item, INTERPRETATION_LINK_ID);
  const dimension = findItem(interpretation?.item, SCORE_DIMENSION_LINK_ID);
  for (const item of dimension?.item ?? []) {
    const value = numericAnswer(item);
    if (value !== undefined) values.set(item.linkId, value);
  }
  return values;
}

/**
 * Collect numeric signal values keyed by signal linkId.
 *
 * @param response - Response to read from.
 * @returns Map of linkId to value for present signals only.
 */
function readSignalValues(
  response: QuestionnaireResponse
): Map<string, number> {
  const values = new Map<string, number>();
  const interpretation = findItem(response.item, INTERPRETATION_LINK_ID);
  const signal = findItem(interpretation?.item, SIGNAL_LINK_ID);
  for (const item of signal?.item ?? []) {
    const value = numericAnswer(item);
    if (value !== undefined) values.set(item.linkId, value);
  }
  return values;
}

/**
 * Resolve one scale definition against its value.
 *
 * @param def - Instrument definition producing the keys.
 * @param scale - Scale definition to read.
 * @param values - Scale values keyed by linkId.
 * @returns The reading, or null when the response has no value.
 */
function readScale(
  def: InstrumentDefinition,
  scale: ScaleDefinition,
  values: Map<string, number>
): ScaleReading | null {
  const value = values.get(scale.linkId);
  if (value === undefined) return null;

  const band = bandFor(scale, value);
  const copyable = scale.reading !== false && band !== null;
  return {
    linkId: scale.linkId,
    value,
    min: scale.min,
    max: scale.max,
    band,
    labelKey: `${def.code}.${scale.linkId}.label`,
    titleKey: copyable ? `${def.code}.${scale.linkId}.${band}.title` : null,
    bodyKey: copyable ? `${def.code}.${scale.linkId}.${band}.body` : null
  };
}

/**
 * Resolve the combine table into a single outcome, when possible.
 *
 * @param def - Instrument definition producing the keys.
 * @param readings - Readings keyed by scale linkId.
 * @returns The combined outcome, or null.
 */
function readCombined(
  def: InstrumentDefinition,
  readings: Map<string, ScaleReading>
): Interpretation['combined'] {
  const combine = def.combine;
  if (!combine) return null;

  const parts: string[] = [];
  for (const linkId of combine.scales) {
    const reading = readings.get(linkId);
    if (reading?.band == null) return null;
    parts.push(`${linkId}:${reading.band}`);
  }

  const id = combine.outcomes[parts.join('|')];
  if (!id) return null;
  return {
    id,
    titleKey: `${def.code}.combined.${id}.title`,
    bodyKey: `${def.code}.combined.${id}.body`
  };
}

/**
 * Interpret a QuestionnaireResponse against a registered instrument.
 *
 * @param response - Response to interpret, may be null.
 * @param coding - Instrument coding identifying the definition.
 * @param registry - Registry to resolve the coding with.
 * @returns The interpretation, or null when the coding is unknown.
 */
export function interpret(
  response: QuestionnaireResponse | null,
  coding: InstrumentCoding | null | undefined,
  registry: InstrumentRegistry
): Interpretation | null {
  const def = registry.get(coding);
  if (!def || !response) return null;

  const scaleValues = readScaleValues(response);
  const readings: ScaleReading[] = [];
  const readingByLinkId = new Map<string, ScaleReading>();
  for (const scale of def.scales) {
    const reading = readScale(def, scale, scaleValues);
    if (!reading) continue;
    readings.push(reading);
    readingByLinkId.set(reading.linkId, reading);
  }

  const signalValues = readSignalValues(response);
  const flagKeys: string[] = [];
  for (const flag of def.flags ?? []) {
    const value = signalValues.get(flag.signal);
    if (value !== undefined && value > flag.above) {
      flagKeys.push(`${def.code}.flag.${flag.id}`);
    }
  }

  const noteKeys: string[] = [];
  for (const note of def.notes ?? []) {
    if (note.when === 'always') {
      noteKeys.push(`${def.code}.note.${note.id}`);
      continue;
    }
    const value = scaleValues.get(note.when.scale);
    if (value !== undefined && value < note.when.below) {
      noteKeys.push(`${def.code}.note.${note.id}`);
    }
  }

  return {
    code: def.code,
    scales: readings,
    combined: readCombined(def, readingByLinkId),
    flagKeys,
    noteKeys
  };
}

/**
 * List every message key a definition can produce.
 *
 * Covers scale labels, band title/body for reading scales, combined outcomes,
 * flags and notes. Used by the messages coverage test.
 *
 * @param def - Instrument definition to enumerate.
 * @returns Flat list of message keys.
 */
export function keysFor(def: InstrumentDefinition): string[] {
  const keys: string[] = [];

  for (const scale of def.scales) {
    keys.push(`${def.code}.${scale.linkId}.label`);
    if (scale.reading === false) continue;
    for (const band of scale.bands) {
      keys.push(
        `${def.code}.${scale.linkId}.${band.id}.title`,
        `${def.code}.${scale.linkId}.${band.id}.body`
      );
    }
  }

  for (const id of Object.values(def.combine?.outcomes ?? {})) {
    keys.push(
      `${def.code}.combined.${id}.title`,
      `${def.code}.combined.${id}.body`
    );
  }

  for (const flag of def.flags ?? []) {
    keys.push(`${def.code}.flag.${flag.id}`);
  }

  for (const note of def.notes ?? []) {
    keys.push(`${def.code}.note.${note.id}`);
  }

  return keys;
}
