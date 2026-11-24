import type { InstrumentDefinition } from '../types';

/**
 * RES-8 resilience instrument definition (version 1).
 *
 * The total scale spans 0-32 and self-confidence spans 0-12. A note always
 * explains that the bands compare against a reference group.
 */
export const RES_8: InstrumentDefinition = {
  code: 'res-8',
  version: '1',
  scales: [
    {
      linkId: 'total',
      min: 0,
      max: 32,
      bands: [
        { id: 'low', min: 0 },
        { id: 'average', min: 19 },
        { id: 'high', min: 28 }
      ]
    },
    {
      linkId: 'self-confidence',
      min: 0,
      max: 12,
      bands: [
        { id: 'low', min: 0 },
        { id: 'average', min: 7 },
        { id: 'high', min: 11 }
      ]
    }
  ],
  notes: [{ id: 'comparison-group', when: 'always' }]
} satisfies InstrumentDefinition;
