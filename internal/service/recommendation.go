// Package service contains BFF orchestration logic that aggregates FHIR
// resources into presentation-ready payloads.
package service

import (
	"context"
	"errors"
	"net/http"
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
	out, seen, err := buildRecommendations(specialties, bundles, nearBundle, params.ServiceTypeCode)
	if err != nil {
		return nil, err
	}
	if len(out) < maxRecommendations {
		out = s.fillWithFallback(ctx, out, seen)
	}
	return out, nil
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

func buildRecommendations(specialties []string, bundles []*searchset, nearBundle *searchset, serviceTypeCode string) ([]Recommendation, map[string]bool, error) {
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
				return nil, nil, err
			}
			continue
		}
		source := "related"
		if i == 0 {
			source = "exact"
		}
		out = appendCandidates(out, seen, logical, near, nearBundle != nil, specialty, serviceTypeCode, source)
	}
	return out, seen, nil
}

// fillWithFallback tops a short candidate list up to maxRecommendations using
// one extra FHIR batch POST that searches any active PractitionerRole, newest
// first. Practitioners already in the pool are skipped and appended cards are
// marked with matchSource fallback so the relevance ranking keeps them last.
// Failures degrade gracefully to the current result.
func (s *RecommendationService) fillWithFallback(ctx context.Context, out []Recommendation, seen map[string]bool) []Recommendation {
	if len(out) >= maxRecommendations {
		return out
	}
	bundles, err := s.fetchBatch(ctx, []string{anyPractitionerRoleQuery()})
	if err != nil || bundles[0] == nil {
		return out
	}
	logical, err := parseRoleBundle(bundles[0])
	if err != nil {
		return out
	}
	for _, candidate := range dedupByPractitioner(buildCandidates(logical, nil, false), "", "") {
		if len(out) >= maxRecommendations {
			break
		}
		if seen[candidate.PractitionerID] {
			continue
		}
		seen[candidate.PractitionerID] = true
		candidate.MatchSource = "fallback"
		out = append(out, candidate)
	}
	return out
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
