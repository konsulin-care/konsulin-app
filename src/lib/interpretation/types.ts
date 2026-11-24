/**
 * Plain, JSON-serialisable types for the instrument interpretation engine.
 *
 * This module is intentionally isolated: it may only import FHIR R4 types and
 * its own files, so it can later be extracted and published as a package.
 */

/** CodeSystem system URI identifying Konsulin instruments. */
export const INSTRUMENT_SYSTEM =
  'https://konsulin.care/fhir/CodeSystem/instrument';

/** Coding that identifies an instrument by system + code. */
export interface InstrumentCoding {
  system: string;
  code: string;
}

/** Inclusive lower bound of a score band. */
export interface BandDefinition {
  id: string;
  min: number;
}

/** A subscale and the bands that describe its values. */
export interface ScaleDefinition {
  linkId: string;
  min: number;
  max: number;
  bands: readonly BandDefinition[];
  /** When false the band is used only by combine lookups and copied nowhere. */
  reading?: boolean;
}

/** Maps a combination of `scale:band` parts to a single outcome id. */
export interface CombineDefinition {
  scales: readonly string[];
  outcomes: Readonly<Record<string, string>>;
}

/** A signal threshold that emits a flag when exceeded. */
export interface FlagDefinition {
  id: string;
  signal: string;
  above: number;
}

/** A note emitted always or when a scale falls below a threshold. */
export interface NoteDefinition {
  id: string;
  when: 'always' | { scale: string; below: number };
}

/** Complete declarative description of one instrument version. */
export interface InstrumentDefinition {
  code: string;
  version: string;
  scales: readonly ScaleDefinition[];
  combine?: CombineDefinition;
  flags?: readonly FlagDefinition[];
  notes?: readonly NoteDefinition[];
}

/** Resolved reading for one scale of a response. */
export interface ScaleReading {
  linkId: string;
  value: number;
  min: number;
  max: number;
  band: string | null;
  labelKey: string;
  titleKey: string | null;
  bodyKey: string | null;
}

/** Fully resolved interpretation, expressed only as message keys. */
export interface Interpretation {
  code: string;
  scales: ScaleReading[];
  combined: { id: string; titleKey: string; bodyKey: string } | null;
  flagKeys: string[];
  noteKeys: string[];
}

/** Lookup abstraction over instrument definitions. */
export interface InstrumentRegistry {
  /**
   * Resolve a definition from an instrument coding.
   *
   * @param coding - Coding to resolve, may be missing.
   * @returns The matching definition, or undefined when unknown.
   */
  get(
    coding: InstrumentCoding | null | undefined
  ): InstrumentDefinition | undefined;
}
