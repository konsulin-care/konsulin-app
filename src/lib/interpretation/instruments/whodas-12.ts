import type { InstrumentDefinition } from '../types';

/**
 * WHODAS-12 functioning instrument definition (version 1).
 *
 * The total scale spans 0-48 with four ascending severity bands.
 */
export const WHODAS_12: InstrumentDefinition = {
  code: 'whodas-12',
  version: '1',
  scales: [
    {
      linkId: 'total',
      min: 0,
      max: 48,
      bands: [
        { id: 'none', min: 0 },
        { id: 'mild', min: 1 },
        { id: 'moderate', min: 5 },
        { id: 'substantial', min: 10 }
      ]
    }
  ]
} satisfies InstrumentDefinition;
