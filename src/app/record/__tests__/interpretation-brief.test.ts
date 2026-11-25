import { interpret, type Interpretation } from '@/lib/interpretation';
import { DEFAULT_REGISTRY } from '@/lib/interpretation/instruments';
import type { QuestionnaireResponse } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { buildInterpretationBrief } from '../interpretation-brief';

/** Translation stub that echoes the message key. */
function keyOnly(key: string): string {
  return `<${key}>`;
}

/**
 * Builds a response whose interpretation item carries the given score and
 * signal values.
 *
 * @param scores - Dimension linkId/value pairs.
 * @param signals - Signal linkId/value pairs.
 * @returns The QuestionnaireResponse fixture.
 */
function response(
  scores: readonly (readonly [string, number])[],
  signals: readonly (readonly [string, number])[] = []
): QuestionnaireResponse {
  const scoreItems = scores.map(([linkId, value]) => ({
    linkId,
    answer: [{ valueInteger: value }]
  }));
  const signalItems = signals.map(([linkId, value]) => ({
    linkId,
    answer: [{ valueInteger: value }]
  }));

  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    item: [
      {
        linkId: 'interpretation',
        item: [
          { linkId: 'score-dimension', item: scoreItems },
          { linkId: 'signal', item: signalItems }
        ]
      }
    ]
  };
}

const PHQ_9 = {
  system: 'https://konsulin.care/fhir/CodeSystem/instrument',
  code: 'phq-9'
};
const OLBI = {
  system: 'https://konsulin.care/fhir/CodeSystem/instrument',
  code: 'olbi'
};

describe('buildInterpretationBrief', () => {
  it('returns null for a null reading and for a reading with no printable parts', () => {
    expect(buildInterpretationBrief(null, keyOnly)).toBeNull();

    const empty: Interpretation = {
      code: 'phq-9',
      scales: [],
      combined: null,
      flagKeys: [],
      noteKeys: []
    };
    expect(buildInterpretationBrief(empty, keyOnly)).toBeNull();
  });

  it('renders the flag, the scale title and body, and the note in order', () => {
    const reading = interpret(
      response([['total', 4]], [['self-harm', 2]]),
      PHQ_9,
      DEFAULT_REGISTRY
    );

    expect(buildInterpretationBrief(reading, keyOnly)).toBe(
      [
        '<phq-9.flag.self-harm>',
        '**<phq-9.total.minimal.title>**\n<phq-9.total.minimal.body>',
        '<phq-9.note.below-threshold>'
      ].join('\n\n')
    );
  });

  it('skips non-printable scales and renders the OLBI combined outcome', () => {
    const reading = interpret(
      response([
        ['exhaustion', 3],
        ['disengagement', 3]
      ]),
      OLBI,
      DEFAULT_REGISTRY
    );

    expect(buildInterpretationBrief(reading, keyOnly)).toBe(
      [
        '**<olbi.combined.burnout.title>**\n<olbi.combined.burnout.body>',
        '<olbi.note.assumes-working>'
      ].join('\n\n')
    );
  });
});
