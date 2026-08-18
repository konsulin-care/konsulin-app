// Package service contains BFF orchestration logic that aggregates FHIR
// resources into presentation-ready payloads.
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
)

// defaultNearRadiusKM is the geographic radius used for Location?near searches
// when the caller provides lat/lon without an explicit radius.
const defaultNearRadiusKM = 50

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

// FetchParams are the intent parameters accepted by the recommendations API.
type FetchParams struct {
	Specialty string
	Latitude  *float64
	Longitude *float64
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

// Fetch returns deduplicated recommendation cards for the requested specialty.
// When lat/lon are provided, candidates whose Location falls outside the
// ?near radius are dropped and distances are attached from the FHIR result.
func (s *RecommendationService) Fetch(ctx context.Context, params FetchParams) ([]Recommendation, error) {
	rolePath := practitionerRoleQuery(params.Specialty)

	results := make(chan fetchResult, 2)
	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		results <- s.fetchBundle(ctx, rolePath)
	}()

	var nearPath string
	if params.Latitude != nil && params.Longitude != nil {
		nearPath = locationNearQuery(*params.Latitude, *params.Longitude)
		wg.Add(1)
		go func() {
			defer wg.Done()
			results <- s.fetchBundle(ctx, nearPath)
		}()
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	var roleBundle, nearBundle *searchset
	var firstErr error
	for res := range results {
		if res.err != nil {
			if firstErr == nil {
				firstErr = res.err
			}
			continue
		}
		if strings.Contains(res.path, "PractitionerRole") {
			roleBundle = res.bundle
		} else {
			nearBundle = res.bundle
		}
	}
	if firstErr != nil {
		return nil, firstErr
	}
	if roleBundle == nil {
		return nil, errors.New("practitioner role search returned no bundle")
	}

	logical, err := parseRoleBundle(roleBundle)
	if err != nil {
		return nil, err
	}

	near := distanceMap(nearBundle)
	candidates := buildCandidates(logical, near, nearBundle != nil)
	best := dedupByPractitioner(candidates, params.Specialty)
	return best, nil
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

// fetchResult carries one parallel FHIR search result.
type fetchResult struct {
	path   string
	bundle *searchset
	err    error
}

// fetchBundle GETs a FHIR search path and decodes the searchset Bundle.
func (s *RecommendationService) fetchBundle(ctx context.Context, path string) fetchResult {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+path, http.NoBody)
	if err != nil {
		return fetchResult{path: path, err: fmt.Errorf("build request for %s: %w", path, err)}
	}
	req.Header.Set("Accept", "application/fhir+json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fetchResult{path: path, err: fmt.Errorf("FETCH %s: %w", path, err)}
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= 400 {
		return fetchResult{path: path, err: fmt.Errorf("FHIR backend returned %d for %s", resp.StatusCode, path)}
	}

	var bundle searchset
	if err := json.NewDecoder(resp.Body).Decode(&bundle); err != nil {
		return fetchResult{path: path, err: fmt.Errorf("decode bundle for %s: %w", path, err)}
	}
	return fetchResult{path: path, bundle: &bundle}
}

// distanceMap extracts Location id → distance-meters from a ?near search bundle.
func distanceMap(bundle *searchset) map[string]float64 {
	out := map[string]float64{}
	if bundle == nil {
		return out
	}
	for _, e := range bundle.Entry {
		_, id, err := resourceMeta(e.Resource)
		if err != nil || id == "" {
			continue
		}
		out[tailRef(id)] = e.DistanceMeters()
	}
	return out
}

// practitionerRoleQuery builds the PractitionerRole search with includes and
// the Schedule reverse include needed for next-slot computation.
func practitionerRoleQuery(specialty string) string {
	const inc = "&_include="
	return "/fhir/PractitionerRole?specialty=" + url.QueryEscape(specialty) +
		"&active=true" +
		inc + "PractitionerRole:practitioner" +
		inc + "PractitionerRole:organization" +
		inc + "PractitionerRole:location" +
		inc + "PractitionerRole:service" +
		"&_revinclude=Schedule:actor"
}

// locationNearQuery builds the Location?near search with the default radius.
func locationNearQuery(lat, lon float64) string {
	value := fmt.Sprintf("%s|%s|%d|km",
		strconv.FormatFloat(lat, 'f', -1, 64),
		strconv.FormatFloat(lon, 'f', -1, 64),
		defaultNearRadiusKM,
	)
	return "/fhir/Location?near=" + url.QueryEscape(value)
}