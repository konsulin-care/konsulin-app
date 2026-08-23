package service

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// cascadeLevel couples one domain-gated tier with a location radius for the
// location-aware cascade.
type cascadeLevel struct {
	tier     recommendationTier
	radiusKm int
}

// buildCascadeLevels expands the fetch tiers into the location cascade: the
// exact tier near, then each remaining tier near and unlimited, so broader
// tiers only contribute when narrower ones fall short of the cap.
func buildCascadeLevels(params FetchParams) []cascadeLevel {
	tiers := buildTiers(params)
	levels := []cascadeLevel{{tier: tiers[0], radiusKm: 10}}
	for _, tier := range tiers[1:] {
		levels = append(levels,
			cascadeLevel{tier: tier, radiusKm: 10},
			cascadeLevel{tier: tier, radiusKm: 0},
		)
	}
	return levels
}

// FetchWithLocation returns up to maxRecommendations recommendation cards
// using cascading queries. When lat/lon are provided, it sends a single
// batch request with one cascade level per URL plus a Location?near query for
// distance extraction, preferring the first level with enough cards and
// falling back to a merged, deduped union of every level (still only the
// declared ICF domain's codes and its generalist). Falls back to Fetch when
// no coordinates are provided.
func (s *RecommendationService) FetchWithLocation(ctx context.Context, params FetchParams) ([]Recommendation, error) {
	if params.Latitude == nil || params.Longitude == nil {
		return s.Fetch(ctx, params)
	}
	if params.Specialty == "" {
		params.Specialty = DomainGeneralist(params.ICFDomain)
	}

	levels := buildCascadeLevels(params)
	urls := make([]string, 0, len(levels)+1)
	for _, level := range levels {
		urls = append(urls, practitionerRoleQueryWithNear(level.tier.codes, *params.Latitude, *params.Longitude, level.radiusKm))
	}
	urls = append(urls, locationNearQueryWithRadius(*params.Latitude, *params.Longitude, levels[0].radiusKm))

	bundles, err := s.fetchBatch(ctx, urls)
	if err != nil {
		return nil, err
	}

	// Last bundle is the near bundle for distance extraction.
	near := distanceMap(bundles[len(bundles)-1])
	for i, level := range levels {
		if i >= len(bundles) || bundles[i] == nil {
			continue
		}
		recs := parseCascadeBundle(bundles[i], near, params.ServiceTypeCode, level.tier.label)
		if len(recs) >= maxRecommendations {
			return recs[:maxRecommendations], nil
		}
	}
	return mergeCascadeLevels(bundles, levels, near, params.ServiceTypeCode), nil
}

// mergeCascadeLevels unions every cascade level, deduping by practitioner so
// the earliest (narrower, higher-priority) tier's card wins, capped at
// maxRecommendations. The union only contains codes from the declared ICF
// domain pool and its generalist, so fewer-than-cap results are valid.
func mergeCascadeLevels(bundles []*searchset, levels []cascadeLevel, near map[string]float64, serviceTypeCode string) []Recommendation {
	out := make([]Recommendation, 0, maxRecommendations)
	seen := map[string]bool{}
	for i, level := range levels {
		if i >= len(bundles) || bundles[i] == nil {
			continue
		}
		logical, err := parseRoleBundle(bundles[i])
		if err != nil {
			continue
		}
		out = appendCandidates(out, seen, logical, near, len(near) > 0,
			strings.Join(level.tier.codes, ","), serviceTypeCode, level.tier.label)
		if len(out) >= maxRecommendations {
			break
		}
	}
	return out
}

// locationNearQueryWithRadius builds the Location?near search with the given radius.
func locationNearQueryWithRadius(lat, lon float64, radiusKm int) string {
	value := fmt.Sprintf("%s|%s|%d|km",
		strconv.FormatFloat(lat, 'f', -1, 64),
		strconv.FormatFloat(lon, 'f', -1, 64),
		radiusKm)
	return "/fhir/Location?near=" + url.QueryEscape(value)
}

// parseCascadeBundle extracts recommendations from a cascade bundle, tagging
// every card with the level's matchSource label. Distance is attached from
// the near map when available.
func parseCascadeBundle(bundle *searchset, near map[string]float64, serviceTypeCode, source string) []Recommendation {
	logical, err := parseRoleBundle(bundle)
	if err != nil {
		return nil
	}
	candidates := buildCandidates(logical, near, len(near) > 0)
	out := dedupByPractitioner(candidates, "", serviceTypeCode)
	for i := range out {
		out[i].MatchSource = source
	}
	return out
}
