import type { QuestionnaireResponse } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { DEFAULT_REGISTRY } from '../instruments';
import { interpret } from '../interpret';
import { INSTRUMENT_SYSTEM, type InstrumentCoding } from '../types';

const PHQ_9: InstrumentCoding = { system: INSTRUMENT_SYSTEM, code: 'phq-9' };
const GAD_7: InstrumentCoding = { system: INSTRUMENT_SYSTEM, code: 'gad-7' };

/**
 * Build a response with a total score and an optional self-harm signal.
 *
 * @param total - Total score placed under score-dimension.
 * @param selfHarm - Self-harm signal value placed under signal, when present.
 * @returns A minimal QuestionnaireResponse matching the live structure.
 */
function response(total: number, selfHarm?: number): QuestionnaireResponse {
  const interpretationItems = [
    {
      linkId: 'score-dimension',
      item: [{ linkId: 'total', answer: [{ valueInteger: total }] }]
    }
  ];

  if (selfHarm !== undefined) {
    interpretationItems.push({
      linkId: 'signal',
      item: [{ linkId: 'self-harm', answer: [{ valueInteger: selfHarm }] }]
    });
  }

  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    item: [{ linkId: 'interpretation', item: interpretationItems }]
  };
}

describe('PHQ-9 instrument', () => {
  it.each([
    [4, 'minimal'],
    [5, 'mild'],
    [10, 'moderate'],
    [15, 'moderately-severe'],
    [20, 'severe']
  ])('maps total %i to band %s', (total, band) => {
    const result = interpret(response(total), PHQ_9, DEFAULT_REGISTRY);
    expect(result?.scales[0]).toMatchObject({
      linkId: 'total',
      value: total,
      band
    });
  });

  it('adds the below-threshold note only for totals below 10', () => {
    const low = interpret(response(9), PHQ_9, DEFAULT_REGISTRY);
    expect(low?.noteKeys).toContain('phq-9.note.below-threshold');

    const atThreshold = interpret(response(10), PHQ_9, DEFAULT_REGISTRY);
    expect(atThreshold?.noteKeys).not.toContain('phq-9.note.below-threshold');
  });

  it('emits the self-harm flag whenever the signal is above 0', () => {
    const raised = interpret(response(0, 1), PHQ_9, DEFAULT_REGISTRY);
    expect(raised?.flagKeys).toContain('phq-9.flag.self-harm');

    const present = interpret(response(10, 3), PHQ_9, DEFAULT_REGISTRY);
    expect(present?.flagKeys).toContain('phq-9.flag.self-harm');

    const clear = interpret(response(10, 0), PHQ_9, DEFAULT_REGISTRY);
    expect(clear?.flagKeys).not.toContain('phq-9.flag.self-harm');
  });
});

describe('GAD-7 instrument', () => {
  it.each([
    [4, 'minimal'],
    [5, 'mild'],
    [10, 'moderate'],
    [15, 'severe']
  ])('maps total %i to band %s', (total, band) => {
    const result = interpret(response(total), GAD_7, DEFAULT_REGISTRY);
    expect(result?.scales[0]).toMatchObject({
      linkId: 'total',
      value: total,
      band
    });
  });

  it('adds the below-threshold note only for totals below 10', () => {
    const low = interpret(response(9), GAD_7, DEFAULT_REGISTRY);
    expect(low?.noteKeys).toContain('gad-7.note.below-threshold');

    const atThreshold = interpret(response(10), GAD_7, DEFAULT_REGISTRY);
    expect(atThreshold?.noteKeys).not.toContain('gad-7.note.below-threshold');
  });
});
