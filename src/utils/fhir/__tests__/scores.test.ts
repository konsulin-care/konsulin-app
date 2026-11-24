import type { QuestionnaireResponse, QuestionnaireResponseItem } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { parseDimensionScores } from '../scores';

/**
 * Builds a QuestionnaireResponse carrying a score-dimension interpretation
 * item with the given dimension scores and reference max.
 */
function buildQR(
  dimensions: Array<{ name: string; score: number }>,
  ref: number
): QuestionnaireResponse {
  return {
    resourceType: 'QuestionnaireResponse',
    id: 'qr-1',
    questionnaire: 'Questionnaire/test-q',
    status: 'completed',
    item: [
      {
        linkId: 'interpretation',
        item: [
          {
            linkId: 'score-dimension',
            item: [
              { linkId: 'reference', answer: [{ valueInteger: ref }] },
              ...dimensions.map(({ name, score }) => ({
                linkId: `score-${name}`,
                text: name,
                answer: [{ valueInteger: score }]
              }))
            ]
          }
        ]
      }
    ]
  };
}

/**
 * Builds a QuestionnaireResponse whose score-dimension item holds a custom
 * reference answer and raw sub-items.
 */
function buildScoreQR(
  referenceAnswer: { valueInteger: number } | { valueDecimal: number },
  items: QuestionnaireResponseItem[]
): QuestionnaireResponse {
  return {
    resourceType: 'QuestionnaireResponse',
    id: 'qr-1',
    questionnaire: 'Questionnaire/test-q',
    status: 'completed',
    item: [
      {
        linkId: 'interpretation',
        item: [
          {
            linkId: 'score-dimension',
            item: [{ linkId: 'reference', answer: [referenceAnswer] }, ...items]
          }
        ]
      }
    ]
  };
}

describe('parseDimensionScores', () => {
  it('returns an empty array for a null response', () => {
    expect(parseDimensionScores(null)).toEqual([]);
  });

  it('returns an empty array when the interpretation item has no nested items', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-1',
      status: 'completed',
      item: [{ linkId: 'interpretation', text: 'summary' }]
    };
    expect(parseDimensionScores(qr)).toEqual([]);
  });

  it('returns an empty array when the score-dimension item has no nested items', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-1',
      status: 'completed',
      item: [
        {
          linkId: 'interpretation',
          item: [{ linkId: 'score-dimension', text: 'PHQ-9' }]
        }
      ]
    };
    expect(parseDimensionScores(qr)).toEqual([]);
  });

  it('returns an empty array when no interpretation item exists', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-1',
      status: 'completed',
      item: [{ linkId: 'q1', text: 'Q1' }]
    };
    expect(parseDimensionScores(qr)).toEqual([]);
  });

  it('parses dimension scores excluding the reference item', () => {
    const qr = buildQR(
      [
        { name: 'Anxiety', score: 3 },
        { name: 'Depression', score: 4 }
      ],
      5
    );
    expect(parseDimensionScores(qr)).toEqual([
      {
        linkId: 'score-Anxiety',
        name: 'Anxiety',
        score: 0.6,
        percentage: 60,
        raw: 3,
        reference: 5
      },
      {
        linkId: 'score-Depression',
        name: 'Depression',
        score: 0.8,
        percentage: 80,
        raw: 4,
        reference: 5
      }
    ]);
  });

  it('falls back to a reference of 1 when the reference item is missing', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-1',
      status: 'completed',
      item: [
        {
          linkId: 'interpretation',
          item: [
            {
              linkId: 'score-dimension',
              item: [
                {
                  linkId: 'score',
                  text: 'Total',
                  answer: [{ valueInteger: 2 }]
                }
              ]
            }
          ]
        }
      ]
    };
    expect(parseDimensionScores(qr)).toEqual([
      {
        linkId: 'score',
        name: 'Total',
        score: 2,
        percentage: 200,
        raw: 2,
        reference: 1
      }
    ]);
  });

  it('skips dimension items without a numeric answer', () => {
    const qr = buildScoreQR({ valueInteger: 4 }, [
      { linkId: 'no-answer', text: 'Empty' },
      { linkId: 'answered', text: 'Done', answer: [{ valueInteger: 2 }] }
    ]);
    expect(parseDimensionScores(qr)).toEqual([
      {
        linkId: 'answered',
        name: 'Done',
        score: 0.5,
        percentage: 50,
        raw: 2,
        reference: 4
      }
    ]);
  });

  it('defaults the dimension name to "Score" when text is missing', () => {
    const qr = buildScoreQR({ valueInteger: 2 }, [
      { linkId: 'bare', answer: [{ valueInteger: 1 }] }
    ]);
    expect(parseDimensionScores(qr)).toEqual([
      {
        linkId: 'bare',
        name: 'Score',
        score: 0.5,
        percentage: 50,
        raw: 1,
        reference: 2
      }
    ]);
  });

  it('handles the five-dimension big-five shape without instrument-specific code', () => {
    const qr = buildQR(
      [
        { name: 'Openness', score: 22 },
        { name: 'Conscientiousness', score: 17 },
        { name: 'Extroversion', score: 26 },
        { name: 'Agreeableness', score: 20 },
        { name: 'Neuroticism', score: 24 }
      ],
      40
    );
    const scores = parseDimensionScores(qr);
    expect(scores).toHaveLength(5);
    expect(scores[0]).toEqual({
      linkId: 'score-Openness',
      name: 'Openness',
      score: 0.55,
      percentage: 55,
      raw: 22,
      reference: 40
    });
    expect(scores[4]).toEqual({
      linkId: 'score-Neuroticism',
      name: 'Neuroticism',
      score: 0.6,
      percentage: 60,
      raw: 24,
      reference: 40
    });
  });

  it('keeps a raw score of 0 instead of skipping it', () => {
    const qr = buildQR([{ name: 'Zero', score: 0 }], 4);
    expect(parseDimensionScores(qr)).toEqual([
      {
        linkId: 'score-Zero',
        name: 'Zero',
        score: 0,
        percentage: 0,
        raw: 0,
        reference: 4
      }
    ]);
  });

  it('reads a valueDecimal answer', () => {
    const qr = buildScoreQR({ valueInteger: 4 }, [
      {
        linkId: 'exhaustion',
        text: 'Exhaustion',
        answer: [{ valueDecimal: 2.5 }]
      }
    ]);
    expect(parseDimensionScores(qr)).toEqual([
      {
        linkId: 'exhaustion',
        name: 'Exhaustion',
        score: 0.625,
        percentage: 63,
        raw: 2.5,
        reference: 4
      }
    ]);
  });

  it('reads a valueDecimal reference', () => {
    const qr = buildScoreQR({ valueDecimal: 8.5 }, [
      { linkId: 'total', text: 'Total', answer: [{ valueInteger: 4 }] }
    ]);
    const scores = parseDimensionScores(qr);
    expect(scores).toHaveLength(1);
    expect(scores[0].linkId).toBe('total');
    expect(scores[0].raw).toBe(4);
    expect(scores[0].reference).toBe(8.5);
  });

  it('carries the source linkId for total and subscale dimensions', () => {
    const qr = buildScoreQR({ valueInteger: 4 }, [
      { linkId: 'total', answer: [{ valueInteger: 3 }] },
      { linkId: 'exhaustion', answer: [{ valueInteger: 1 }] }
    ]);
    const linkIds = parseDimensionScores(qr).map(({ linkId }) => linkId);
    expect(linkIds).toEqual(['total', 'exhaustion']);
  });

  it('skips all dimensions when the reference is zero or negative', () => {
    const zero = buildQR([{ name: 'Zero', score: 2 }], 0);
    expect(parseDimensionScores(zero)).toEqual([]);
    const negative = buildQR([{ name: 'Negative', score: 2 }], -1);
    expect(parseDimensionScores(negative)).toEqual([]);
  });
});
