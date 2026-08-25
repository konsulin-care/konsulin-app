import type { Recommendation } from '@/types/recommendation';
import { describe, expect, it } from 'vitest';
import { mapRecommendationToCard } from '../recommendation-card';

const LIVE_REC: Recommendation = {
  practitionerRoleId: 'role-1',
  practitionerId: 'practitioner-42',
  practitionerName: 'dr. Budi Santoso',
  practitionerPhoto: 'https://cdn.example.com/photos/budi.jpg',
  specialties: ['anxiety', 'depression'],
  scheduleId: 'schedule-1',
  healthcareServiceId: 'service-1',
  healthcareServiceName: 'Cognitive Behavioral Therapy',
  durationMinutes: 60,
  fee: 400_000,
  currency: 'IDR',
  nextSlot: { start: '2026-08-22T10:00:00Z', end: '2026-08-22T11:00:00Z' },
  locationId: 'loc-1',
  locationName: 'Rumah Bicara',
  locationAddress: { city: 'Jakarta' },
  distanceKm: 2.4
};

describe('mapRecommendationToCard', () => {
  it('maps the live BFF payload onto the home card view model', () => {
    expect(mapRecommendationToCard(LIVE_REC)).toEqual({
      id: 'practitioner-42',
      photoUrl: 'https://cdn.example.com/photos/budi.jpg',
      name: 'dr. Budi Santoso',
      serviceName: 'Cognitive Behavioral Therapy',
      specialties: ['anxiety', 'depression'],
      fee: 400_000,
      description: 'At Rumah Bicara',
      practitionerRoleId: 'role-1',
      healthcareServiceId: 'service-1'
    });
  });

  it('keeps the practitioner id so booking still targets the practitioner', () => {
    expect(mapRecommendationToCard(LIVE_REC).id).toBe('practitioner-42');
  });

  it('falls back to an empty description when no location is available', () => {
    const noLocation = { ...LIVE_REC, locationName: '' };
    expect(mapRecommendationToCard(noLocation).description).toBe('');
  });

  it('maps practitionerPhoto to photoUrl', () => {
    const withPhoto = {
      ...LIVE_REC,
      practitionerPhoto: 'https://cdn.example.com/photos/budi.jpg'
    };
    expect(mapRecommendationToCard(withPhoto).photoUrl).toBe(
      'https://cdn.example.com/photos/budi.jpg'
    );
  });

  it('falls back to empty photoUrl when practitionerPhoto is missing', () => {
    const noPhoto = { ...LIVE_REC, practitionerPhoto: undefined };
    expect(mapRecommendationToCard(noPhoto).photoUrl).toBe('');
  });
});
