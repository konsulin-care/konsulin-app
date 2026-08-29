import type { QuestionnaireResponse, QuestionnaireResponseItem } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { extractResultBrief, updateQRInterpretationItem } from '../qr-extract';

// ---------------------------------------------------------------------------
// extractResultBrief
// ---------------------------------------------------------------------------

describe('extractResultBrief', () => {
  it('extracts result-brief from interpretation item', () => {
    const qr = {
      item: [
        {
          linkId: 'interpretation',
          item: [
            {
              linkId: 'result-brief',
              answer: [{ valueString: 'Mild depression' }]
            }
          ]
        }
      ]
    } as QuestionnaireResponse;
    expect(extractResultBrief(qr)).toBe('Mild depression');
  });

  it('returns empty string when no result-brief', () => {
    const qr = { item: [] } as QuestionnaireResponse;
    expect(extractResultBrief(qr)).toBe('');
  });

  it('trims whitespace from result', () => {
    const qr = {
      item: [
        {
          linkId: 'interpretation',
          item: [
            {
              linkId: 'result-brief',
              answer: [{ valueString: '  Moderate  ' }]
            }
          ]
        }
      ]
    } as QuestionnaireResponse;
    expect(extractResultBrief(qr)).toBe('Moderate');
  });
});

// ---------------------------------------------------------------------------
// updateQRInterpretationItem
// ---------------------------------------------------------------------------

describe('updateQRInterpretationItem', () => {
  it('adds result-brief to interpretation item', () => {
    const qr = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-1',
      item: [
        {
          linkId: 'interpretation',
          item: [
            {
              linkId: 'score-dimension',
              item: [{ linkId: 'ref', answer: [{ valueInteger: 5 }] }]
            }
          ]
        }
      ]
    } as unknown as QuestionnaireResponse;

    const updated = updateQRInterpretationItem(qr, 'New result');

    const interpItem = updated.item.find(
      (i: QuestionnaireResponseItem) => i.linkId === 'interpretation'
    );
    const resultBrief = interpItem?.item?.find(
      (i: QuestionnaireResponseItem) => i.linkId === 'result-brief'
    );
    expect(resultBrief?.answer?.[0]).toEqual({ valueString: 'New result' });
  });

  it('replaces existing result-brief', () => {
    const qr = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-1',
      item: [
        {
          linkId: 'interpretation',
          item: [
            { linkId: 'result-brief', answer: [{ valueString: 'Old result' }] }
          ]
        }
      ]
    } as unknown as QuestionnaireResponse;

    const updated = updateQRInterpretationItem(qr, 'Updated result');

    const interpItem = updated.item.find(
      (i: QuestionnaireResponseItem) => i.linkId === 'interpretation'
    );
    const resultBriefs = interpItem?.item?.filter(
      (i: QuestionnaireResponseItem) => i.linkId === 'result-brief'
    );
    expect(resultBriefs).toHaveLength(1);
    expect(resultBriefs?.[0].answer?.[0]).toEqual({
      valueString: 'Updated result'
    });
  });

  it('preserves other interpretation items', () => {
    const qr = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-1',
      item: [
        {
          linkId: 'interpretation',
          item: [
            { linkId: 'score-dimension', item: [] },
            { linkId: 'result-brief', answer: [{ valueString: 'Old' }] }
          ]
        }
      ]
    } as unknown as QuestionnaireResponse;

    const updated = updateQRInterpretationItem(qr, 'New');

    const interpItem = updated.item.find(
      (i: QuestionnaireResponseItem) => i.linkId === 'interpretation'
    );
    expect(interpItem?.item).toHaveLength(2);
    expect(
      interpItem?.item?.find(
        (i: QuestionnaireResponseItem) => i.linkId === 'score-dimension'
      )
    ).toBeDefined();
  });
});
