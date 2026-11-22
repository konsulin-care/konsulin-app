import { describe, expect, it } from 'vitest';

import type { PendingSubmission } from '@/lib/indexeddb';
import { ownerKeyFor, ownerOf } from '@/lib/submission-owner';

/** Builds a pending submission carrying an arbitrary payload. */
function makeItem(kind: string, payload: unknown): PendingSubmission<unknown> {
  return {
    id: 'item-1',
    ownerId: '',
    kind,
    payload,
    createdAt: 1,
    attempts: 0
  };
}

describe('ownerKeyFor', () => {
  it('returns the Patient owner key for an authenticated patient', () => {
    expect(
      ownerKeyFor({ isAuthenticated: true, role: 'Patient', fhirId: 'p1' })
    ).toBe('Patient/p1');
  });

  it('returns the Practitioner owner key for a researcher', () => {
    expect(
      ownerKeyFor({
        isAuthenticated: true,
        role: 'Researcher',
        fhirId: 'x1'
      })
    ).toBe('Practitioner/x1');
  });

  it('returns the unbound guest key for an unauthenticated identity', () => {
    expect(ownerKeyFor({ isAuthenticated: false, role: 'Guest' })).toBe(
      'guest:unbound'
    );
  });
});

describe('ownerOf', () => {
  it('returns the payload author reference for a questionnaire response', () => {
    const item = makeItem('questionnaire-response', {
      resourceType: 'QuestionnaireResponse',
      author: { reference: 'Patient/patient-1' }
    });

    expect(ownerOf(item)).toBe('Patient/patient-1');
  });

  it('returns the guest identifier owner for an anonymous payload', () => {
    const item = makeItem('questionnaire-response', {
      resourceType: 'QuestionnaireResponse',
      identifier: [
        {
          system: 'https://login.konsulin.care/guestid',
          value: 'guest-123'
        }
      ]
    });

    expect(ownerOf(item)).toBe('guest:guest-123');
  });

  it('returns guest:unbound when neither author nor identifier is present', () => {
    const item = makeItem('questionnaire-response', {
      resourceType: 'QuestionnaireResponse'
    });

    expect(ownerOf(item)).toBe('guest:unbound');
  });

  it('returns the first entry author reference for a soap bundle', () => {
    const item = makeItem('soap-bundle', {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          resource: {
            resourceType: 'Encounter',
            subject: { reference: 'Patient/patient-1' }
          }
        },
        {
          resource: {
            resourceType: 'Observation',
            author: { reference: 'Practitioner/practitioner-7' }
          }
        },
        {
          resource: {
            resourceType: 'Observation',
            author: { reference: 'Practitioner/practitioner-9' }
          }
        }
      ]
    });

    expect(ownerOf(item)).toBe('Practitioner/practitioner-7');
  });
});
