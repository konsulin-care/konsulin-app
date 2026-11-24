import type { InstrumentDefinition } from '../types';

/**
 * GAD-7 anxiety instrument definition (version 1).
 *
 * The total scale spans 0-21. Scores below 10 add a reassuring note
 * explaining that the result is mild.
 */
export const GAD_7: InstrumentDefinition = {
  code: 'gad-7',
  version: '1',
  scales: [
    {
      linkId: 'total',
      min: 0,
      max: 21,
      bands: [
        { id: 'minimal', min: 0 },
        { id: 'mild', min: 5 },
        { id: 'moderate', min: 10 },
        { id: 'severe', min: 15 }
      ]
    }
  ],
  notes: [{ id: 'below-threshold', when: { scale: 'total', below: 10 } }]
} satisfies InstrumentDefinition;
