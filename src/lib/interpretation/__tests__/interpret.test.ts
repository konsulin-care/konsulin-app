import type { QuestionnaireResponse } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { interpret, keysFor } from '../interpret';
import { createRegistry } from '../registry';
import {
  INSTRUMENT_SYSTEM,
  type InstrumentCoding,
  type InstrumentDefinition
} from '../types';

const DEF: InstrumentDefinition = {
  code: 'demo',
  version: '1.0.0',
  scales: [
    {
      linkId: 'focus',
      min: 0,
      max: 12,
      bands: [
        { id: 'low', min: 0 },
        { id: 'mid', min: 4 },
        { id: 'high', min: 8 }
      ]
    },
    {
      linkId: 'energy',
      min: 0,
      max: 12,
      bands: [
        { id: 'low', min: 0 },
        { id: 'high', min: 6 }
      ]
    },
    {
      linkId: 'hidden',
      min: 0,
      max: 12,
      reading: false,
      bands: [
        { id: 'low', min: 0 },
        { id: 'high', min: 6 }
      ]
    }
  ],
  combine: {
    scales: ['focus', 'energy'],
    outcomes: { 'focus:mid|energy:low': 'drained' }
  },
  flags: [{ id: 'risk', signal: 'risk', above: 1 }],
  notes: [
    { id: 'always', when: 'always' },
    { id: 'low-focus', when: { scale: 'focus', below: 9 } },
    { id: 'never', when: { scale: 'focus', below: 3 } }
  ]
};

const CODING: InstrumentCoding = { system: INSTRUMENT_SYSTEM, code: 'demo' };

const registry = createRegistry([DEF]);

/**
 * Build a response with the engine's expected nesting.
 *
 * @param dimensions - Scale linkId/value pairs.
 * @param signals - Signal linkId/value pairs.
 * @returns A minimal QuestionnaireResponse.
 */
function response(
  dimensions: ReadonlyArray<[string, number]>,
  signals: ReadonlyArray<[string, number]> = []
): QuestionnaireResponse {
  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    item: [
      {
        linkId: 'interpretation',
        item: [
          {
            linkId: 'score-dimension',
            item: dimensions.map(([linkId, value]) => ({
              linkId,
              answer: [{ valueDecimal: value }]
            }))
          },
          {
            linkId: 'signal',
            item: signals.map(([linkId, value]) => ({
              linkId,
              answer: [{ valueInteger: value }]
            }))
          }
        ]
      }
    ]
  };
}

describe('registry', () => {
  it('returns null for unknown or missing codings and resolves known ones', () => {
    expect(interpret(response([['focus', 7]]), null, registry)).toBeNull();
    expect(interpret(response([['focus', 7]]), undefined, registry)).toBeNull();
    expect(
      interpret(
        response([['focus', 7]]),
        { system: INSTRUMENT_SYSTEM, code: 'unknown' },
        registry
      )
    ).toBeNull();
    expect(registry.get({ system: INSTRUMENT_SYSTEM, code: 'demo' })).toBe(DEF);
  });
});

describe('interpret', () => {
  it('assigns the last band at or below the value', () => {
    const result = interpret(response([['focus', 7]]), CODING, registry);
    expect(result?.scales).toHaveLength(1);
    expect(result?.scales[0]).toMatchObject({
      linkId: 'focus',
      value: 7,
      min: 0,
      max: 12,
      band: 'mid',
      labelKey: 'demo.focus.label',
      titleKey: 'demo.focus.mid.title',
      bodyKey: 'demo.focus.mid.body'
    });
  });

  it('drops the band and copy keys outside the scale range', () => {
    const result = interpret(response([['focus', 20]]), CODING, registry);
    expect(result?.scales[0]).toMatchObject({
      band: null,
      labelKey: 'demo.focus.label',
      titleKey: null,
      bodyKey: null
    });
    expect(result?.combined).toBeNull();
  });

  it('omits scales missing from the response', () => {
    const result = interpret(response([['focus', 7]]), CODING, registry);
    expect(result?.scales.map(scale => scale.linkId)).toEqual(['focus']);
  });

  it('resolves combine, flags and notes', () => {
    const result = interpret(
      response(
        [
          ['focus', 7],
          ['energy', 3]
        ],
        [['risk', 2]]
      ),
      CODING,
      registry
    );
    expect(result?.combined).toEqual({
      id: 'drained',
      titleKey: 'demo.combined.drained.title',
      bodyKey: 'demo.combined.drained.body'
    });
    expect(result?.flagKeys).toEqual(['demo.flag.risk']);
    expect(result?.noteKeys).toEqual([
      'demo.note.always',
      'demo.note.low-focus'
    ]);
  });

  it('emits no flag when the signal is at or below the threshold', () => {
    const result = interpret(
      response([['focus', 7]], [['risk', 1]]),
      CODING,
      registry
    );
    expect(result?.flagKeys).toEqual([]);
  });
});

describe('keysFor', () => {
  it('lists every key the definition can produce', () => {
    const keys = keysFor(DEF);
    expect(keys).toEqual(
      expect.arrayContaining([
        'demo.focus.label',
        'demo.focus.high.title',
        'demo.focus.high.body',
        'demo.energy.low.title',
        'demo.energy.low.body',
        'demo.combined.drained.title',
        'demo.combined.drained.body',
        'demo.flag.risk',
        'demo.note.always',
        'demo.note.low-focus',
        'demo.note.never'
      ])
    );
    expect(keys).toContain('demo.hidden.label');
    expect(keys).not.toContain('demo.hidden.low.title');
    expect(new Set(keys).size).toBe(keys.length);
  });
});
