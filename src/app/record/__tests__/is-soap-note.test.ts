import { describe, expect, it } from 'vitest';
import { isSoapNote } from '../record-renderers';

const CANONICAL_SOAP = 'https://konsulin.care/fhir/Questionnaire/soap';

describe('isSoapNote', () => {
  it('recognizes the canonical soap questionnaire url', () => {
    expect(isSoapNote({ questionnaire: CANONICAL_SOAP })).toBe(true);
  });

  it('still recognizes the legacy relative reference', () => {
    expect(isSoapNote({ questionnaire: 'Questionnaire/soap' })).toBe(true);
  });

  it('rejects non-soap canonical questionnaires', () => {
    expect(
      isSoapNote({
        questionnaire: 'https://konsulin.care/fhir/Questionnaire/phq2'
      })
    ).toBe(false);
  });

  it('rejects a missing questionnaire', () => {
    expect(isSoapNote({})).toBe(false);
  });
});
