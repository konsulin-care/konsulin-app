import type { Bundle, QuestionnaireResponse } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { parseQRBundle } from '../parse-searchset-bundles';

function soapBundle(questionnaire: string): Bundle {
  const qr = {
    resourceType: 'QuestionnaireResponse',
    id: 'soap-1',
    status: 'completed',
    questionnaire,
    subject: { reference: 'Patient/pat-1' },
    meta: { lastUpdated: '2024-06-01T00:00:00Z' },
    item: [
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
  } as QuestionnaireResponse;
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: [{ resource: qr }]
  };
}

describe('parseQRBundle SOAP classification', () => {
  it('classifies canonical soap urls as SOAP Notes', () => {
    const result = parseQRBundle(
      soapBundle('https://konsulin.care/fhir/Questionnaire/soap')
    );
    expect(result[0].type).toBe('SOAP Notes');
  });

  it('still classifies the legacy relative reference as SOAP Notes', () => {
    const result = parseQRBundle(soapBundle('Questionnaire/soap'));
    expect(result[0].type).toBe('SOAP Notes');
  });

  it('classifies canonical non-soap urls as QuestionnaireResponse', () => {
    const result = parseQRBundle(
      soapBundle('https://konsulin.care/fhir/Questionnaire/phq2')
    );
    expect(result[0].type).toBe('QuestionnaireResponse');
  });
});
