// Package service contains BFF orchestration logic that aggregates FHIR
// resources into presentation-ready payloads.
package service

import (
	"context"
	"errors"
	"net/http"
	"strings"
)

// maxRecommendations caps the number of cards returned by Fetch and the
// cascade. Fewer results are valid: the fill only draws from the complaint's
// ICF-domain pool and its generalist, never from unrelated specialties.
const maxRecommendations = 4

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
func NewRecommendationService(opts RecommendationOptions) *RecommendationService { // skipcq: GO-RVV-B0001 — intentional: export internal func
	client := opts.Client
	if client == nil {
		client = http.DefaultClient
	}
	return &RecommendationService{
		baseURL: strings.TrimRight(opts.BackendBaseURL, "/"),
		client:  client,
	}
}

// recommendationTier is one query level of the domain-gated cascade: a set of
// NUCC codes and the matchSource label their cards carry.
type recommendationTier struct {
	label string
	codes []string
}

// buildTiers assembles the cascade tiers from the fetch params: exact code
// first, then the complaint's ICF-domain competence pool, then the domain
// generalist. Without a declared icfDomain only the exact tier exists.
func buildTiers(params FetchParams) []recommendationTier {
	exact := params.Specialty
	if exact == "" {
		exact = DomainGeneralist(params.ICFDomain)
	}
	tiers := []recommendationTier{{label: "exact", codes: []string{exact}}}
	if params.ICFDomain == "" {
		return tiers
	}
	pool := domainCodes(params.ICFDomain, exact)
	if len(pool) > 0 {
		tiers = append(tiers, recommendationTier{label: "related", codes: pool})
	}
	if generalist := DomainGeneralist(params.ICFDomain); generalist != exact {
		tiers = append(tiers, recommendationTier{label: "fallback", codes: []string{generalist}})
	}
	return tiers
}

// Fetch returns up to maxRecommendations recommendation cards for the
// requested intent. The exact-specialty tier is queried first, then the
// complaint's ICF-domain competence pool, then the domain generalist; only
// the declared domain's codes can ever surface. Fewer than maxRecommendations
// results are valid. The whole fetch is one FHIR batch request.
func (s *RecommendationService) Fetch(ctx context.Context, params FetchParams) ([]Recommendation, error) {
	if params.Specialty == "" {
		params.Specialty = DomainGeneralist(params.ICFDomain)
	}
	tiers := buildTiers(params)
	urls := make([]string, len(tiers))
	for i, tier := range tiers {
		urls[i] = practitionerRoleQueryAll(tier.codes)
	}
	bundles, err := s.fetchBatch(ctx, urls)
	if err != nil {
		return nil, err
	}
	if len(bundles) == 0 || bundles[0] == nil {
		return nil, errors.New("practitioner role search returned no bundle")
	}
	return buildRecommendationTiers(tiers, bundles, params.ServiceTypeCode), nil
}

// buildRecommendationTiers merges per-tier bundles into up to
// maxRecommendations cards, deduping by practitioner across tiers so the
// exact tier's card wins over an identical related card.
func buildRecommendationTiers(tiers []recommendationTier, bundles []*searchset, serviceTypeCode string) []Recommendation {
	out := make([]Recommendation, 0, maxRecommendations)
	seen := map[string]bool{}
	for i, tier := range tiers {
		if i >= len(bundles) || bundles[i] == nil {
			continue
		}
		logical, err := parseRoleBundle(bundles[i])
		if err != nil {
			continue
		}
		out = appendCandidates(out, seen, CandidateParams{
			Logical:         logical,
			Near:            nil,
			UseNear:         false,
			Specialty:       strings.Join(tier.codes, ","),
			ServiceTypeCode: serviceTypeCode,
			Source:          tier.label,
		})
	}
	return out
}

// CandidateParams groups parameters for appendCandidates.
type CandidateParams struct {
	Logical         *logicalBundle
	Near            map[string]float64
	UseNear         bool
	Specialty       string
	ServiceTypeCode string
	Source          string
}

func appendCandidates(out []Recommendation, seen map[string]bool, params CandidateParams) []Recommendation {
	for _, candidate := range dedupByPractitioner(buildCandidates(params.Logical, params.Near, params.UseNear), params.Specialty, params.ServiceTypeCode) {
		if len(out) >= maxRecommendations {
			break
		}
		if seen[candidate.PractitionerID] {
			continue
		}
		seen[candidate.PractitionerID] = true
		candidate.MatchSource = params.Source
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
