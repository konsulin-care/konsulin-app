import { describe, expect, it } from 'vitest';
import {
  PRACTITIONER_REF_PREFIX,
  buildShareUrl,
  parseReferralRef
} from '../referral';

const ORIGIN = 'https://konsulin.care';

describe('PRACTITIONER_REF_PREFIX', () => {
  it('is defined as pr_', () => {
    expect(PRACTITIONER_REF_PREFIX).toBe('pr_');
  });
});

describe('buildShareUrl for researchers', () => {
  it('builds a researcher link carrying ref=pr_<fhirId>', () => {
    expect(
      buildShareUrl({
        origin: ORIGIN,
        isPatient: false,
        fhirId: 'practitioner-123'
      })
    ).toBe('https://konsulin.care/research?ref=pr_practitioner-123');
  });

  it('builds a study-scoped researcher link with ref', () => {
    expect(
      buildShareUrl({
        origin: ORIGIN,
        isPatient: false,
        fhirId: 'practitioner-123',
        studyId: 'study-abc'
      })
    ).toBe(
      'https://konsulin.care/research?view=study-abc&ref=pr_practitioner-123'
    );
  });

  it('does not add ref when fhirId is absent', () => {
    expect(
      buildShareUrl({
        origin: ORIGIN,
        isPatient: false,
        studyId: 'study-abc'
      })
    ).toBe('https://konsulin.care/research?view=study-abc');
  });

  it('prefers patient ref over practitioner ref when isPatient is true', () => {
    expect(
      buildShareUrl({
        origin: ORIGIN,
        isPatient: true,
        fhirId: 'patient-123'
      })
    ).toBe('https://konsulin.care/research?ref=p_patient-123');
  });
});

describe('parseReferralRef for practitioners', () => {
  it('parses a practitioner ref', () => {
    expect(parseReferralRef('pr_practitioner-123')).toEqual({
      kind: 'practitioner',
      fhirId: 'practitioner-123'
    });
  });

  it('parses a patient ref', () => {
    expect(parseReferralRef('p_patient-123')).toEqual({
      kind: 'patient',
      fhirId: 'patient-123'
    });
  });

  it('returns null for malformed refs', () => {
    expect(parseReferralRef(null)).toBeNull();
    expect(parseReferralRef('')).toBeNull();
    expect(parseReferralRef('x_invalid')).toBeNull();
    expect(parseReferralRef('pr_')).toBeNull();
    expect(parseReferralRef('p_')).toBeNull();
  });
});
