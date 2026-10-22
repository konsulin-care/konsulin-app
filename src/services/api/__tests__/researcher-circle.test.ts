import type { Communication } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { deriveResearcherReferralStats } from '../researcher-circle';

function makeCommunication(senderRef: string): Communication {
  return {
    resourceType: 'Communication',
    id: 'test',
    status: 'completed',
    sender: { reference: senderRef },
    recipient: [{ reference: 'Practitioner/practitioner-1' }],
    topic: {
      coding: [
        {
          system: 'http://konsulin.care/fhir/CodeSystem/research-referral',
          code: 'research-referral'
        }
      ]
    }
  };
}

describe('deriveResearcherReferralStats', () => {
  it('returns zero for empty communications', () => {
    const stats = deriveResearcherReferralStats([]);
    expect(stats.referralCount).toBe(0);
  });

  it('counts distinct senders', () => {
    const communications = [
      makeCommunication('Patient/patient-1'),
      makeCommunication('Patient/patient-2'),
      makeCommunication('Patient/patient-3')
    ];
    const stats = deriveResearcherReferralStats(communications);
    expect(stats.referralCount).toBe(3);
  });

  it('deduplicates senders', () => {
    const communications = [
      makeCommunication('Patient/patient-1'),
      makeCommunication('Patient/patient-1'),
      makeCommunication('Patient/patient-2')
    ];
    const stats = deriveResearcherReferralStats(communications);
    expect(stats.referralCount).toBe(2);
  });

  it('handles communications without sender', () => {
    const communications = [
      {
        resourceType: 'Communication' as const,
        id: 'test',
        status: 'completed' as const,
        recipient: [{ reference: 'Practitioner/practitioner-1' }]
      }
    ];
    const stats = deriveResearcherReferralStats(communications);
    expect(stats.referralCount).toBe(0);
  });
});
