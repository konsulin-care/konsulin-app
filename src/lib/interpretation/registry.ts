import {
  INSTRUMENT_SYSTEM,
  type InstrumentCoding,
  type InstrumentDefinition,
  type InstrumentRegistry
} from './types';

/**
 * Build the registry map key for a system + code pair.
 *
 * @param coding - Coding to key, may be null or missing fields.
 * @returns The `system|code` key, or an empty string when coding is absent.
 */
export function codingKey(coding: InstrumentCoding | null | undefined): string {
  if (!coding) return '';
  return `${coding.system}|${coding.code}`;
}

/**
 * Create an instrument registry keyed by `${INSTRUMENT_SYSTEM}|${code}`.
 *
 * @param defs - Instrument definitions to index.
 * @returns A registry exposing `get(coding)`.
 */
export function createRegistry(
  defs: readonly InstrumentDefinition[]
): InstrumentRegistry {
  const byKey = new Map<string, InstrumentDefinition>();
  for (const def of defs) {
    byKey.set(`${INSTRUMENT_SYSTEM}|${def.code}`, def);
  }

  return {
    get(coding) {
      return coding ? byKey.get(codingKey(coding)) : undefined;
    }
  };
}
