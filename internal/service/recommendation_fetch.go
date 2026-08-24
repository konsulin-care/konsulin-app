package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// fhirContentType is the standard FHIR JSON media type.
const fhirContentType = "application/fhir+json"

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
	req.Header.Set("Accept", fhirContentType)

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

// buildBatchRequest creates a FHIR batch bundle request for the given URLs.
func buildBatchRequest(ctx context.Context, baseURL string, urls []string) (*http.Request, error) {
	reqEntries := make([]map[string]any, 0, len(urls))
	for _, u := range urls {
		reqEntries = append(reqEntries, map[string]any{
			"request": map[string]any{"method": "GET", "url": batchEntryURL(u)},
		})
	}
	body, err := json.Marshal(map[string]any{
		"resourceType": "Bundle",
		"type":         "batch",
		"entry":        reqEntries,
	})
	if err != nil {
		return nil, fmt.Errorf("marshal batch request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/fhir", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build batch request: %w", err)
	}
	req.Header.Set("Content-Type", fhirContentType)
	req.Header.Set("Accept", fhirContentType)
	return req, nil
}

// batchResponseEntry represents a single entry in a FHIR batch response.
type batchResponseEntry struct {
	Resource json.RawMessage `json:"resource"`
	Response struct {
		Status string `json:"status"`
	} `json:"response"`
}

// doBatchRequest executes a FHIR batch request and returns the raw entries.
func doBatchRequest(ctx context.Context, client *http.Client, req *http.Request) ([]batchResponseEntry, error) {
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute batch request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("FHIR backend returned %d for batch", resp.StatusCode)
	}

	var batch struct {
		Entry []batchResponseEntry `json:"entry"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&batch); err != nil {
		return nil, fmt.Errorf("decode batch response: %w", err)
	}
	return batch.Entry, nil
}

// fetchBatch POSTs one FHIR batch bundle of GET requests to /fhir and returns
// the per-request searchsets aligned positionally with urls. An entry whose
// response status is not 200 maps to nil (and is skipped by the caller).
func (s *RecommendationService) fetchBatch(ctx context.Context, urls []string) ([]*searchset, error) {
	req, err := buildBatchRequest(ctx, s.baseURL, urls)
	if err != nil {
		return nil, err
	}

	entries, err := doBatchRequest(ctx, s.client, req)
	if err != nil {
		return nil, err
	}

	out := make([]*searchset, len(urls))
	for i := range urls {
		if i >= len(entries) {
			break
		}
		if entries[i].Response.Status != "200" {
			continue
		}
		var ss searchset
		if err := json.Unmarshal(entries[i].Resource, &ss); err != nil {
			continue
		}
		out[i] = &ss
	}
	return out, nil
}

// FetchSlotBatch POSTs one FHIR batch bundle of GET requests and returns
// the raw resource JSON for each entry, aligned positionally with urls.
// An entry whose response status is not 200 maps to nil.
func (s *RecommendationService) FetchSlotBatch(ctx context.Context, urls []string) ([]json.RawMessage, error) {
	req, err := buildBatchRequest(ctx, s.baseURL, urls)
	if err != nil {
		return nil, err
	}

	entries, err := doBatchRequest(ctx, s.client, req)
	if err != nil {
		return nil, err
	}

	out := make([]json.RawMessage, len(urls))
	for i := range urls {
		if i >= len(entries) {
			break
		}
		if entries[i].Response.Status != "200" {
			continue
		}
		out[i] = entries[i].Resource
	}
	return out, nil
}

// batchEntryURL converts a full "/fhir/..." search path into the relative URL
// a FHIR batch entry expects (relative to the /fhir base).
func batchEntryURL(path string) string {
	return strings.TrimPrefix(path, "/fhir/")
}

// distanceMap extracts Location id to distance-meters from a near search bundle.
func distanceMap(bundle *searchset) map[string]float64 {
	out := map[string]float64{}
	if bundle == nil {
		return out
	}
	for _, entry := range bundle.Entry {
		_, id, err := resourceMeta(entry.Resource)
		if err != nil || id == "" {
			continue
		}
		out[tailRef(id)] = entry.DistanceMeters()
	}
	return out
}

// practitionerRoleQueryAll builds the PractitionerRole search for a set of
// NUCC codes (comma-joined OR), with includes and the Schedule reverse
// include needed for next-slot computation.
func practitionerRoleQueryAll(specialties []string) string {
	const inc = "&_include="
	return "/fhir/PractitionerRole?specialty=" + url.QueryEscape(strings.Join(specialties, ",")) +
		"&active=true" +
		inc + "PractitionerRole:practitioner" +
		inc + "PractitionerRole:organization" +
		inc + "PractitionerRole:location" +
		inc + "PractitionerRole:service" +
		"&_revinclude=Schedule:actor"
}

// practitionerRoleQueryWithNear builds a PractitionerRole search with
// location.near filtering, _count=5, and _sort=-_lastUpdated. When
// radiusKm is 0, the location.near parameter is omitted.
func practitionerRoleQueryWithNear(specialties []string, lat, lon float64, radiusKm int) string {
	specialtyParam := strings.Join(specialties, ",")
	const inc = "&_include="

	query := "/fhir/PractitionerRole?" +
		"specialty=" + url.QueryEscape(specialtyParam) +
		"&active=true" +
		"&_count=5" +
		"&_sort=-_lastUpdated" +
		inc + "PractitionerRole:practitioner" +
		inc + "PractitionerRole:location" +
		inc + "PractitionerRole:service"

	if radiusKm > 0 {
		near := fmt.Sprintf("%s|%s|%d|km",
			strconv.FormatFloat(lat, 'f', -1, 64),
			strconv.FormatFloat(lon, 'f', -1, 64),
			radiusKm)
		query += "&location.near=" + url.QueryEscape(near)
	}

	return query
}
