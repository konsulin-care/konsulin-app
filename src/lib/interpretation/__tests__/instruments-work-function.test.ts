import type { QuestionnaireResponse } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { DEFAULT_REGISTRY } from '../instruments';
import { interpret } from '../interpret';
import { INSTRUMENT_SYSTEM, type InstrumentCoding } from '../types';

const OLBI: InstrumentCoding = { system: INSTRUMENT_SYSTEM, code: 'olbi' };
const RES_8: InstrumentCoding = { system: INSTRUMENT_SYSTEM, code: 'res-8' };
const WHODAS_12: InstrumentCoding = {
  system: INSTRUMENT_SYSTEM,
  code: 'whodas-12'
};

/**
 * Build a response with the engine's expected score-dimension nesting.
 *
 * @param dimensions - Scale linkId/value pairs.
 * @returns A minimal QuestionnaireResponse matching the live structure.
 */
function response(
  dimensions: ReadonlyArray<[string, number]>
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
          }
        ]
      }
    ]
  };
}

describe('OLBI instrument', () => {
  it.each([
    [1, 1, 'none'],
    [2.25, 1, 'exhausted'],
    [1, 2.1, 'disengaged'],
    [2.25, 2.1, 'burnout'],
    [4, 4, 'burnout']
  ])(
    'combines exhaustion %s and disengagement %s into %s',
    (exhaustion, disengagement, outcome) => {
      const result = interpret(
        response([
          ['exhaustion', exhaustion],
          ['disengagement', disengagement]
        ]),
        OLBI,
        DEFAULT_REGISTRY
      );
      expect(result?.combined).toEqual({
        id: outcome,
        titleKey: `olbi.combined.${outcome}.title`,
        bodyKey: `olbi.combined.${outcome}.body`
      });
    }
  );

  it('emits no per-scale title or body keys', () => {
    const result = interpret(
      response([
        ['exhaustion', 3],
        ['disengagement', 3]
      ]),
      OLBI,
      DEFAULT_REGISTRY
    );
    expect(result?.scales).toHaveLength(2);
    for (const scale of result?.scales ?? []) {
      expect(scale.titleKey).toBeNull();
      expect(scale.bodyKey).toBeNull();
    }
  });

  it('always adds the assumes-working note', () => {
    const result = interpret(
      response([
        ['exhaustion', 1],
        ['disengagement', 1]
      ]),
      OLBI,
      DEFAULT_REGISTRY
    );
    expect(result?.noteKeys).toEqual(['olbi.note.assumes-working']);
  });
});

describe('RES-8 instrument', () => {
  it.each([
    [18, 'low'],
    [19, 'average'],
    [28, 'high']
  ])('maps total %i to band %s', (total, band) => {
    const result = interpret(
      response([['total', total]]),
      RES_8,
      DEFAULT_REGISTRY
    );
    expect(result?.scales[0]).toMatchObject({
      linkId: 'total',
      value: total,
      band
    });
  });

  it.each([
    [6, 'low'],
    [7, 'average'],
    [11, 'high']
  ])('maps self-confidence %i to band %s', (value, band) => {
    const result = interpret(
      response([['self-confidence', value]]),
      RES_8,
      DEFAULT_REGISTRY
    );
    expect(result?.scales[0]).toMatchObject({
      linkId: 'self-confidence',
      value,
      band
    });
  });

  it('always adds the comparison-group note', () => {
    const result = interpret(
      response([
        ['total', 32],
        ['self-confidence', 12]
      ]),
      RES_8,
      DEFAULT_REGISTRY
    );
    expect(result?.noteKeys).toEqual(['res-8.note.comparison-group']);
  });
});

describe('WHODAS-12 instrument', () => {
  it.each([
    [0, 'none'],
    [1, 'mild'],
    [5, 'moderate'],
    [10, 'substantial'],
    [48, 'substantial']
  ])('maps total %i to band %s', (total, band) => {
    const result = interpret(
      response([['total', total]]),
      WHODAS_12,
      DEFAULT_REGISTRY
    );
    expect(result?.scales[0]).toMatchObject({
      linkId: 'total',
      value: total,
      band
    });
  });
});
