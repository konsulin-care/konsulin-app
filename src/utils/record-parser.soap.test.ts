import type { Bundle, QuestionnaireResponse } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { parseRecordBundlePractitioner } from './fhir/record-bundle';

type SoapRecord = { type: string };

function soapBundle(questionnaire: string): Bundle {
  const qr = {
    resourceType: 'QuestionnaireResponse',
    id: 'soap-1',
    status: 'completed',
    questionnaire,
    subject: { reference: 'Patient/pat-1' },
    author: { reference: 'Practitioner/dr-1' },
    meta: { lastUpdated: '2024-06-01T00:00:00Z' },
    item: []
  } as QuestionnaireResponse;
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: [
      {
        resource: {
          resourceType: 'Bundle',
          type: 'searchset',
          entry: [{ resource: qr }]
        }
      }
    ]
  };
}

describe('parseRecordBundlePractitioner SOAP classification', () => {
  it('classifies canonical soap urls as SOAP Notes', () => {
    const result = parseRecordBundlePractitioner(
      soapBundle('https://konsulin.care/fhir/Questionnaire/soap')
    ) as SoapRecord[];
    expect(result[0].type).toBe('SOAP Notes');
  });

  it('still classifies the legacy relative reference as SOAP Notes', () => {
    const result = parseRecordBundlePractitioner(
      soapBundle('Questionnaire/soap')
    ) as SoapRecord[];
    expect(result[0].type).toBe('SOAP Notes');
  });

  it('classifies canonical non-soap urls as QuestionnaireResponse', () => {
    const result = parseRecordBundlePractitioner(
      soapBundle('https://konsulin.care/fhir/Questionnaire/phq2')
    ) as SoapRecord[];
    expect(result[0].type).toBe('QuestionnaireResponse');
  });
});
