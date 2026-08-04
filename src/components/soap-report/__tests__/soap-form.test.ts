import { describe, expect, it } from 'vitest';
import { buildSoapResponseResource } from '../soap-form';

describe('buildSoapResponseResource', () => {
  it('sets the canonical soap questionnaire url on the response', () => {
    const qr = buildSoapResponseResource(
      {
        id: 'soap-1',
        resourceType: 'QuestionnaireResponse',
        status: 'in-progress',
        item: [{ linkId: 'subjective' }]
      },
      { reference: 'Practitioner/dr-1' },
      { reference: 'Patient/pat-1' },
      '2026-01-01T00:00:00Z'
    );

    expect(qr.questionnaire).toBe(
      'https://konsulin.care/fhir/Questionnaire/soap'
    );
    expect(qr.status).toBe('completed');
    expect(qr.authored).toBe('2026-01-01T00:00:00Z');
    expect(qr.author).toEqual({ reference: 'Practitioner/dr-1' });
    expect(qr.subject).toEqual({ reference: 'Patient/pat-1' });
  });
});
