import type { Recommendation } from '@/types/recommendation';

/**
 * Home card view model — the shape the patient-home swipe card renders.
 * Kept separate from the BFF payload so the UI contract cannot be polluted
 * by API internals.
 */
export interface HomeRecommendationCard {
  id: string;
  photoUrl: string;
  name: string;
  serviceName: string;
  specialties: string[];
  fee: number;
  description: string;
}

/**
 * Map a live BFF recommendation onto the home card view model.
 *
 * The card id is the practitioner id so the existing booking redirect
 * (`/appointment?practitioner={id}`) keeps working unchanged.
 *
 * @param recommendation - Live recommendation from `/api/recommendations`
 * @returns View model ready for the patient-home swipe card
 */
export function mapRecommendationToCard(
  recommendation: Recommendation
): HomeRecommendationCard {
  return {
    id: recommendation.practitionerId,
    photoUrl: '',
    name: recommendation.practitionerName,
    serviceName: recommendation.healthcareServiceName,
    specialties: recommendation.specialties,
    fee: recommendation.fee,
    description: recommendation.locationName
      ? `At ${recommendation.locationName}`
      : ''
  };
}
