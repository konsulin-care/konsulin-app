/**
 * Types for the recommendation engine BFF payload (`/api/recommendations`).
 * Mirrors the Go service structs 1:1 — change both sides together.
 */

export interface RecommendationAddress {
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
}

export interface RecommendationTimeSlot {
  start: string;
  end: string;
}

/** One pre-joined recommendation card: one practitioner, one service, one location. */
export interface Recommendation {
  practitionerRoleId: string;
  practitionerId: string;
  practitionerName: string;
  specialties: string[];
  scheduleId: string;
  healthcareServiceId: string;
  healthcareServiceName: string;
  durationMinutes: number;
  fee: number;
  currency: string;
  nextSlot?: RecommendationTimeSlot | null;
  locationId: string;
  locationName: string;
  locationAddress: RecommendationAddress;
  distanceKm?: number | null;
}

export interface RecommendationsResponse {
  specialty: string;
  recommendations: Recommendation[];
}

export interface SpecialtiesResponse {
  specialties: string[];
}
