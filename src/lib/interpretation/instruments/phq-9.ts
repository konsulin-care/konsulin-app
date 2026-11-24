import type { InstrumentDefinition } from '../types';

/**
 * PHQ-9 depression instrument definition (version 1).
 *
 * The total scale spans 0-27. Item 9 is surfaced as a self-harm signal, and
 * scores below 10 add a reassuring note explaining that the result is mild.
 */
export const PHQ_9: InstrumentDefinition = {
  code: 'phq-9',
  version: '1',
  scales: [
    {
      linkId: 'total',
      min: 0,
      max: 27,
      bands: [
        { id: 'minimal', min: 0 },
        { id: 'mild', min: 5 },
        { id: 'moderate', min: 10 },
        { id: 'moderately-severe', min: 15 },
        { id: 'severe', min: 20 }
      ]
    }
  ],
  flags: [{ id: 'self-harm', signal: 'self-harm', above: 0 }],
  notes: [{ id: 'below-threshold', when: { scale: 'total', below: 10 } }]
} satisfies InstrumentDefinition;
