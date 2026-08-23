package service

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strconv"
)

// cascadeLevel defines one level in the recommendation cascade.
type cascadeLevel struct {
	specialties []string
	radiusKm    int
}

// buildCascadeURLs builds the 4 cascade levels for location-aware queries.
func buildCascadeURLs(specialty string, lat, lon float64) []cascadeLevel {
	nearby := nearbySpecialties(specialty)
	allSpecialties := append([]string{specialty}, nearby...)

	return []cascadeLevel{
		{specialties: []string{specialty}, radiusKm: 10}, // Level 1: exact, 10km
		{specialties: allSpecialties, radiusKm: 10},      // Level 2: exact + related, 10km
		{specialties: []string{specialty}, radiusKm: 25}, // Level 3: exact, 25km
		{specialties: allSpecialties, radiusKm: 0},       // Level 4: exact + related, no filter
	}
}

// FetchWithLocation returns up to maxRecommendations recommendation cards
// using cascading queries. When lat/lon are provided, it sends a single
// batch request with 4 cascade levels plus a Location?near query for
// distance extraction. Picks the first level with >= maxRecommendations
// results. Falls back to legacy path when no coordinates are provided.
func (s *RecommendationService) FetchWithLocation(ctx context.Context, params FetchParams) ([]Recommendation, error) {
	if params.Latitude == nil || params.Longitude == nil {
		return s.Fetch(ctx, params)
	}

	levels := buildCascadeURLs(params.Specialty, *params.Latitude, *params.Longitude)
	// Add Location?near query for distance extraction
	urls := make([]string, len(levels)+1)
	for i, level := range levels {
		urls[i] = practitionerRoleQueryWithNear(level.specialties, *params.Latitude, *params.Longitude, level.radiusKm)
	}
	// Last entry is Location?near for distance extraction (use smallest radius)
	urls[len(urls)-1] = locationNearQueryWithRadius(*params.Latitude, *params.Longitude, levels[0].radiusKm)

	bundles, err := s.fetchBatch(ctx, urls)
	if err != nil {
		return nil, err
	}

	// Last bundle is the near bundle for distance extraction
	near := distanceMap(bundles[len(bundles)-1])
	if recs, ok := pickCascadeLevel(bundles, near, params.ServiceTypeCode); ok {
		return recs, nil
	}
	return s.fillCascadeFallback(ctx, bundles, near, params.ServiceTypeCode)
}

// pickCascadeLevel returns the first cascade level whose deduped candidates
// reach maxRecommendations, capped at that many cards.
func pickCascadeLevel(bundles []*searchset, near map[string]float64, serviceTypeCode string) ([]Recommendation, bool) {
	for _, bundle := range bundles {
		if bundle == nil || len(bundle.Entry) == 0 {
			continue
		}
		recs := parseCascadeBundle(bundle, near, serviceTypeCode)
		if len(recs) >= maxRecommendations {
			return recs[:maxRecommendations], true
		}
	}
	return nil, false
}

// fillCascadeFallback returns the broadest cascade level's cards, topped up
// to five with the any-active fallback fill when the pool is short.
func (s *RecommendationService) fillCascadeFallback(ctx context.Context, bundles []*searchset, near map[string]float64, serviceTypeCode string) ([]Recommendation, error) {
	lastLevel := bundles[len(bundles)-2] // -2 because last entry is near bundle
	if lastLevel == nil {
		return nil, errors.New("no recommendations found")
	}
	recs := parseCascadeBundle(lastLevel, near, serviceTypeCode)
	if len(recs) > 0 && len(recs) < maxRecommendations {
		seen := make(map[string]bool, len(recs))
		for _, r := range recs {
			seen[r.PractitionerID] = true
		}
		recs = s.fillWithFallback(ctx, recs, seen)
	}
	return recs, nil
}

// locationNearQueryWithRadius builds the Location?near search with the given radius.
func locationNearQueryWithRadius(lat, lon float64, radiusKm int) string {
	value := fmt.Sprintf("%s|%s|%d|km",
		strconv.FormatFloat(lat, 'f', -1, 64),
		strconv.FormatFloat(lon, 'f', -1, 64),
		radiusKm)
	return "/fhir/Location?near=" + url.QueryEscape(value)
}

// parseCascadeBundle extracts recommendations from a cascade bundle.
// Distance is attached from the near map when available.
func parseCascadeBundle(bundle *searchset, near map[string]float64, serviceTypeCode string) []Recommendation {
	logical, err := parseRoleBundle(bundle)
	if err != nil {
		return nil
	}
	candidates := buildCandidates(logical, near, len(near) > 0)
	return dedupByPractitioner(candidates, "", serviceTypeCode)
}