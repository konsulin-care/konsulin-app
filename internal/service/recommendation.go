// Package service contains BFF orchestration logic that aggregates FHIR
// resources into presentation-ready payloads.
package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// defaultNearRadiusKM is the geographic radius used for Location?near searches
// when the caller provides lat/lon without an explicit radius.
const defaultNearRadiusKM = 50

// maxRecommendations caps the number of cards returned by Fetch, including
// related-specialty fill. Kept in the service so exact-first ordering survives
// (the handler's NarrowRecommendations becomes a no-op safety net).
const maxRecommendations = 5

// distanceExtensionURL is the FHIR standard extension Blaze attaches to
// Location search results carrying the distance in meters.
const distanceExtensionURL = "http://hl7.org/fhir/StructureDefinition/location-distance"

// feeExtensionURL is the canonical fee extension for HealthcareService.
const feeExtensionURL = "http://konsulin.care/fhir/StructureDefinition/fee"

// durationExtensionURL is the appointment-duration extension used by seeds.
const durationExtensionURL = "https://konsulin.care/StructureDefinition/appointment-duration"

// Address mirrors the FHIR Location.address sub-elements surfaced to clients.
type Address struct {
	Line     []string `json:"line,omitempty"`
	City     string   `json:"city,omitempty"`
	District string   `json:"district,omitempty"`
	State    string   `json:"state,omitempty"`
}

// TimeSlot is a concrete bookable interval expressed as ISO 8601 instants.
type TimeSlot struct {
	Start string `json:"start"`
	End   string `json:"end"`
}

// AvailableTimeWindow mirrors PractitionerRole.availableTime.
type AvailableTimeWindow struct {
	DaysOfWeek []string `json:"daysOfWeek"`
	StartTime  string   `json:"availableStartTime"`
	EndTime    string   `json:"availableEndTime"`
}

// Recommendation is one pre-joined recommendation card: exactly one
// practitioner, one HealthcareService, and one Location.
type Recommendation struct {
	PractitionerRoleID    string                `json:"practitionerRoleId"`
	PractitionerID        string                `json:"practitionerId"`
	PractitionerName      string                `json:"practitionerName"`
	PractitionerPhoto     string                `json:"practitionerPhoto"`
	MatchSource           string                `json:"matchSource,omitempty"`
	Specialties           []string              `json:"specialties"`
	ScheduleID            string                `json:"scheduleId"`
	HealthcareServiceID   string                `json:"healthcareServiceId"`
	HealthcareServiceName string                `json:"healthcareServiceName"`
	DurationMinutes       int                   `json:"durationMinutes"`
	Fee                   int                   `json:"fee"`
	Currency              string                `json:"currency"`
	NextSlot              *TimeSlot             `json:"nextSlot,omitempty"`
	LocationID            string                `json:"locationId"`
	LocationName          string                `json:"locationName"`
	LocationAddress       Address               `json:"locationAddress"`
	DistanceKm            *float64              `json:"distanceKm,omitempty"`
	AvailableTime         []AvailableTimeWindow `json:"-"`
	serviceTypeCodes      []string              `json:"-"`
}

// FetchParams holds the input parameters for a recommendation fetch.
type FetchParams struct {
	Specialty       string
	ServiceTypeCode string
	ICFDomain       string
	Latitude        *float64
	Longitude       *float64
}

// RecommendationOptions configures a RecommendationService.
type RecommendationOptions struct {
	BackendBaseURL string
	Client         *http.Client
}

// RecommendationService aggregates PractitionerRole, Practitioner,
// HealthcareService, Location, and Schedule resources from a FHIR backend.
type RecommendationService struct {
	baseURL string
	client  *http.Client
}

// NewRecommendationService creates a service bound to the given FHIR backend.
func NewRecommendationService(opts RecommendationOptions) *RecommendationService {
	client := opts.Client
	if client == nil {
		client = http.DefaultClient
	}
	return &RecommendationService{
		baseURL: strings.TrimRight(opts.BackendBaseURL, "/"),
		client:  client,
	}
}

// Fetch returns up to maxRecommendations recommendation cards for the
// requested specialty. Exact-specialty matches are returned first; when fewer
// than maxRecommendations, cards from semantically-nearby decision-tree
// specialties fill the remainder. The whole fill is one FHIR batch request.
// When lat/lon are provided, candidates whose Location falls outside the
// ?near radius are dropped and distances are attached from the FHIR result.
func (s *RecommendationService) Fetch(ctx context.Context, params FetchParams) ([]Recommendation, error) {
	specialties, bundles, nearBundle, err := s.fetchRecommendationBundles(ctx, params)
	if err != nil {
		return nil, err
	}
	return buildRecommendations(specialties, bundles, nearBundle, params.ServiceTypeCode)
}

func (s *RecommendationService) fetchRecommendationBundles(ctx context.Context, params FetchParams) ([]string, []*searchset, *searchset, error) {
	specialties := append([]string{params.Specialty}, nearbySpecialties(params.Specialty)...)
	urls := make([]string, 0, len(specialties)+1)
	for _, specialty := range specialties {
		urls = append(urls, practitionerRoleQuery(specialty))
	}
	nearIdx := -1
	if params.Latitude != nil && params.Longitude != nil {
		nearIdx = len(urls)
		urls = append(urls, locationNearQuery(*params.Latitude, *params.Longitude))
	}
	bundles, err := s.fetchBatch(ctx, urls)
	if err != nil {
		return nil, nil, nil, err
	}
	if len(bundles) == 0 || bundles[0] == nil {
		return nil, nil, nil, errors.New("practitioner role search returned no bundle")
	}
	var nearBundle *searchset
	if nearIdx >= 0 && nearIdx < len(bundles) {
		nearBundle = bundles[nearIdx]
	}
	return specialties, bundles, nearBundle, nil
}

func buildRecommendations(specialties []string, bundles []*searchset, nearBundle *searchset, serviceTypeCode string) ([]Recommendation, error) {
	near := distanceMap(nearBundle)
	out := make([]Recommendation, 0, maxRecommendations)
	seen := map[string]bool{}
	for i, specialty := range specialties {
		if len(out) >= maxRecommendations || i >= len(bundles) || bundles[i] == nil {
			continue
		}
		logical, err := parseRoleBundle(bundles[i])
		if err != nil {
			if i == 0 {
				return nil, err
			}
			continue
		}
		source := "related"
		if i == 0 {
			source = "exact"
		}
		out = appendCandidates(out, seen, logical, near, nearBundle != nil, specialty, serviceTypeCode, source)
	}
	return out, nil
}

func appendCandidates(out []Recommendation, seen map[string]bool, logical *logicalBundle, near map[string]float64, useNear bool, specialty, serviceTypeCode, source string) []Recommendation {
	for _, candidate := range dedupByPractitioner(buildCandidates(logical, near, useNear), specialty, serviceTypeCode) {
		if len(out) >= maxRecommendations {
			break
		}
		if seen[candidate.PractitionerID] {
			continue
		}
		seen[candidate.PractitionerID] = true
		candidate.MatchSource = source
		out = append(out, candidate)
	}
	return out
}

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
	nearBundle := bundles[len(bundles)-1]
	near := distanceMap(nearBundle)

	// Pick the first level with >= maxRecommendations results
	for _, bundle := range bundles {
		if bundle == nil || len(bundle.Entry) == 0 {
			continue
		}
		recs := parseCascadeBundle(bundle, near, params.ServiceTypeCode)
		if len(recs) >= maxRecommendations {
			return recs[:maxRecommendations], nil
		}
	}

	// Fallback: return the last level's results
	lastLevel := bundles[len(bundles)-2] // -2 because last entry is near bundle
	if lastLevel != nil {
		return parseCascadeBundle(lastLevel, near, params.ServiceTypeCode), nil
	}
	return nil, errors.New("no recommendations found")
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

// DistinctSpecialties returns the sorted distinct specialty names across all
// active PractitionerRoles, derived from the FHIR `_elements` search.
func (s *RecommendationService) DistinctSpecialties(ctx context.Context) ([]string, error) {
	res := s.fetchBundle(ctx, "/fhir/PractitionerRole?active=true&_elements=specialty")
	if res.err != nil {
		return nil, res.err
	}
	if res.bundle == nil {
		return nil, errors.New("specialty search returned no bundle")
	}
	return distinctSpecialtiesFromBundle(res.bundle), nil
}
