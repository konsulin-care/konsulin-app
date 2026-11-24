/**
 * Isolated instrument interpretation engine.
 *
 * Pure TypeScript with no app imports so it can later be extracted into its
 * own package.
 */

export { INSTRUMENT_SYSTEM } from './types';
export type {
  BandDefinition,
  CombineDefinition,
  FlagDefinition,
  InstrumentCoding,
  InstrumentDefinition,
  InstrumentRegistry,
  Interpretation,
  NoteDefinition,
  ScaleDefinition,
  ScaleReading
} from './types';

export { interpret, keysFor } from './interpret';
export { codingKey, createRegistry } from './registry';
