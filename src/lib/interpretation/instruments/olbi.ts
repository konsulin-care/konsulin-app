import type { InstrumentDefinition } from '../types';

/**
 * OLBI burnout instrument definition (version 1).
 *
 * Exhaustion and disengagement are scored separately (1-4) and never printed
 * as standalone readings; a combine table turns both bands into one outcome.
 */
export const OLBI: InstrumentDefinition = {
  code: 'olbi',
  version: '1',
  scales: [
    {
      linkId: 'exhaustion',
      min: 1,
      max: 4,
      reading: false,
      bands: [
        { id: 'low', min: 1 },
        { id: 'high', min: 2.25 }
      ]
    },
    {
      linkId: 'disengagement',
      min: 1,
      max: 4,
      reading: false,
      bands: [
        { id: 'low', min: 1 },
        { id: 'high', min: 2.1 }
      ]
    }
  ],
  combine: {
    scales: ['exhaustion', 'disengagement'],
    outcomes: {
      'exhaustion:low|disengagement:low': 'none',
      'exhaustion:high|disengagement:low': 'exhausted',
      'exhaustion:low|disengagement:high': 'disengaged',
      'exhaustion:high|disengagement:high': 'burnout'
    }
  },
  notes: [{ id: 'assumes-working', when: 'always' }]
} satisfies InstrumentDefinition;
