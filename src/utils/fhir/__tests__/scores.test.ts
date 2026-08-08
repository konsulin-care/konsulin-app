import type { QuestionnaireResponse } from 'fhir/r4';
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

describe('parseDimensionScores', () => {
  it('returns an empty array for a null response', () => {
    expect(parseDimensionScores(null)).toEqual([]);
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
      { name: 'Anxiety', score: 0.6, percentage: 60, raw: 3, reference: 5 },
      { name: 'Depression', score: 0.8, percentage: 80, raw: 4, reference: 5 }
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
      { name: 'Total', score: 2, percentage: 200, raw: 2, reference: 1 }
    ]);
  });

  it('skips dimension items without a numeric answer', () => {
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
                { linkId: 'reference', answer: [{ valueInteger: 4 }] },
                { linkId: 'no-answer', text: 'Empty' },
                {
                  linkId: 'answered',
                  text: 'Done',
                  answer: [{ valueInteger: 2 }]
                }
              ]
            }
          ]
        }
      ]
    };
    expect(parseDimensionScores(qr)).toEqual([
      { name: 'Done', score: 0.5, percentage: 50, raw: 2, reference: 4 }
    ]);
  });

  it('defaults the dimension name to "Score" when text is missing', () => {
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
                { linkId: 'reference', answer: [{ valueInteger: 2 }] },
                { linkId: 'bare', answer: [{ valueInteger: 1 }] }
              ]
            }
          ]
        }
      ]
    };
    expect(parseDimensionScores(qr)).toEqual([
      { name: 'Score', score: 0.5, percentage: 50, raw: 1, reference: 2 }
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
      name: 'Openness',
      score: 0.55,
      percentage: 55,
      raw: 22,
      reference: 40
    });
    expect(scores[4]).toEqual({
      name: 'Neuroticism',
      score: 0.6,
      percentage: 60,
      raw: 24,
      reference: 40
    });
  });
});
