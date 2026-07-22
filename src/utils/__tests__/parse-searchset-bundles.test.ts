import type { IRecord } from '@/types/record';
import type { Bundle, QuestionnaireResponse } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  parseQRBundle,
  resolveQuestionnaireTitle
} from '../parse-searchset-bundles';

/** Helper: build a QuestionnaireResponse searchset Bundle. */
function qrBundle(
  items: Array<{
    id: string;
    lastUpdated: string;
    questionnaire: string;
    isSoap: boolean;
    authorRef?: string;
  }>
): Bundle {
  const entry = items.map(input => {
    const item = input.isSoap
      ? [
          {
            linkId: 'subjective',
            text: 'Subjective',
            item: [
              {
                linkId: 'complaint',
                text: 'Complaint',
                answer: [{ valueString: 'Headache' }]
              }
            ]
          }
        ]
      : [
          {
            linkId: 'interpretation',
            item: [
              {
                linkId: 'result-brief',
                answer: [{ valueString: 'Score: 12' }]
              }
            ]
          }
        ];
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: input.id,
      status: 'completed',
      questionnaire: input.questionnaire,
      subject: { reference: 'Patient/pat-1' },
      meta: { lastUpdated: input.lastUpdated },
      item,
      ...(input.authorRef ? { author: { reference: input.authorRef } } : {})
    } as QuestionnaireResponse;
    return { resource: qr };
  });
  return { resourceType: 'Bundle', type: 'searchset', entry } as Bundle;
}

describe('parseQRBundle', () => {
  it('parses SOAP QuestionnaireResponse as SOAP Notes', () => {
    const bundle = qrBundle([
      {
        id: 'qr-1',
        lastUpdated: '2024-06-01T00:00:00Z',
        questionnaire: 'Questionnaire/soap',
        isSoap: true
      }
    ]);
    const result = parseQRBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('SOAP Notes');
    expect(result[0].resourceType).toBe('QuestionnaireResponse');
  });

  it('parses assessment QuestionnaireResponse', () => {
    const bundle = qrBundle([
      {
        id: 'qr-2',
        lastUpdated: '2024-06-01T00:00:00Z',
        questionnaire: 'Questionnaire/phq9',
        isSoap: false
      }
    ]);
    const result = parseQRBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('QuestionnaireResponse');
    expect(result[0].resourceType).toBe('QuestionnaireResponse');
  });

  it('skips practitioner-authored QRs when skipPractitionerAuthored is true', () => {
    const bundle = qrBundle([
      {
        id: 'qr-p',
        lastUpdated: '2024-06-01T00:00:00Z',
        questionnaire: 'Questionnaire/phq9',
        isSoap: false,
        authorRef: 'Patient/pat-1'
      },
      {
        id: 'qr-d',
        lastUpdated: '2024-06-02T00:00:00Z',
        questionnaire: 'Questionnaire/phq9',
        isSoap: false,
        authorRef: 'Practitioner/dr-1'
      }
    ]);
    const result = parseQRBundle(bundle, { skipPractitionerAuthored: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toContain('qr-p');
  });

  it('includes practitioner-authored QRs by default', () => {
    const bundle = qrBundle([
      {
        id: 'qr-p',
        lastUpdated: '2024-06-01T00:00:00Z',
        questionnaire: 'Questionnaire/phq9',
        isSoap: false,
        authorRef: 'Patient/pat-1'
      },
      {
        id: 'qr-d',
        lastUpdated: '2024-06-02T00:00:00Z',
        questionnaire: 'Questionnaire/phq9',
        isSoap: false,
        authorRef: 'Practitioner/dr-1'
      }
    ]);
    const result = parseQRBundle(bundle);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for null/undefined/empty input', () => {
    expect(parseQRBundle(null as unknown as Bundle)).toEqual([]);
    expect(parseQRBundle(undefined as unknown as Bundle)).toEqual([]);
    expect(
      parseQRBundle({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: []
      } as Bundle)
    ).toEqual([]);
  });

  it('extracts questionnaire ID from canonical title', () => {
    const record: IRecord = {
      type: 'QuestionnaireResponse',
      resourceType: 'QuestionnaireResponse',
      id: 'QuestionnaireResponse/qr-1',
      title: 'Questionnaire/phq9',
      result: 'Score: 12',
      lastUpdated: '2024-06-01T00:00:00Z'
    };
    expect(resolveQuestionnaireTitle(record)).toBe('phq9');
  });

  it('returns title as-is if not a canonical reference', () => {
    const record: IRecord = {
      type: 'QuestionnaireResponse',
      resourceType: 'QuestionnaireResponse',
      id: 'QuestionnaireResponse/qr-1',
      title: 'Already resolved title',
      result: 'Score: 12',
      lastUpdated: '2024-06-01T00:00:00Z'
    };
    expect(resolveQuestionnaireTitle(record)).toBe('Already resolved title');
  });
});
