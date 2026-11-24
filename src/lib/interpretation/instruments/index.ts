import { createRegistry } from '../registry';
import type { InstrumentDefinition } from '../types';
import { GAD_7 } from './gad-7';
import { PHQ_9 } from './phq-9';

/**
 * Every instrument definition known to the interpretation engine.
 *
 * Later instrument batches append their definitions to this array.
 */
export const INSTRUMENTS: readonly InstrumentDefinition[] = [PHQ_9, GAD_7];

/**
 * Shared registry over {@link INSTRUMENTS}.
 */
export const DEFAULT_REGISTRY = createRegistry(INSTRUMENTS);
