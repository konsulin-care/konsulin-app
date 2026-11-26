package proxycache

import (
	"encoding/json"
	"net/url"
	"sort"
	"strings"
)

// publicCatalogTypes lists the resource types every role, including Guest, may
// read. QuestionnaireResponse and ResearchSubject are handled separately
// because they are cacheable only for count queries.
var publicCatalogTypes = map[string]struct{}{
	"Questionnaire":     {},
	"ResearchStudy":     {},
	"Organization":      {},
	"HealthcareService": {},
	"Location":          {},
	"Media":             {},
	"CodeSystem":        {},
	"ValueSet":          {},
	"PractitionerRole":  {},
}

// identityParams lists query parameters that scope a search to a specific
// patient or practitioner, which makes the response unsafe to share.
var identityParams = []string{
	"author",
	"identifier",
	"subject",
	"patient",
	"individual",
	"practitioner",
	"actor",
	"performer",
	"participant",
	"_has",
}

// CacheKey returns a canonical cache key for path and rawQuery with query
// parameters sorted by key and then by value.
func CacheKey(path, rawQuery string) string {
	values, err := url.ParseQuery(rawQuery)
	if err != nil {
		values = url.Values{}
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var b strings.Builder
	b.WriteString(path)
	b.WriteByte('?')
	for i, key := range keys {
		vals := append([]string(nil), values[key]...)
		sort.Strings(vals)
		for j, val := range vals {
			if i > 0 || j > 0 {
				b.WriteByte('&')
			}
			b.WriteString(url.QueryEscape(key))
			b.WriteByte('=')
			b.WriteString(url.QueryEscape(val))
		}
	}
	return b.String()
}

// Cacheable reports whether a GET request for path and rawQuery may be served
// from the shared proxy cache, returning the resource type when it may.
func Cacheable(method, path, rawQuery string) (string, bool) {
	if !strings.EqualFold(method, "GET") {
		return "", false
	}
	resourceType, _ := parseFHIRPath(path)
	if resourceType == "" {
		return "", false
	}
	query, err := url.ParseQuery(rawQuery)
	if err != nil {
		return "", false
	}
	for _, param := range identityParams {
		if _, present := query[param]; present {
			return "", false
		}
	}
	for key := range query {
		if strings.HasPrefix(key, "_has:") {
			return "", false
		}
	}
	if resourceType == "QuestionnaireResponse" || resourceType == "ResearchSubject" {
		if query.Get("_summary") != "count" {
			return "", false
		}
		return resourceType, true
	}
	if _, allowed := publicCatalogTypes[resourceType]; !allowed {
		return "", false
	}
	return resourceType, true
}

// InvalidationType reports which cached resource type a write must invalidate,
// returning "*" for a Bundle transaction POST on /fhir.
func InvalidationType(method, path string) (string, bool) {
	switch strings.ToUpper(method) {
	case "POST", "PUT", "PATCH", "DELETE":
	default:
		return "", false
	}
	resourceType, _ := parseFHIRPath(path)
	if resourceType != "" {
		return resourceType, true
	}
	if strings.ToUpper(method) == "POST" && strings.TrimSuffix(path, "/") == "/fhir" {
		return "*", true
	}
	return "", false
}

// readOnlyBundleBody is the subset of a FHIR Bundle needed to decide whether a
// POST body only performs reads.
type readOnlyBundleBody struct {
	ResourceType string `json:"resourceType"`
	Type         string `json:"type"`
	Entry        []struct {
		Request *struct {
			Method string `json:"method"`
		} `json:"request"`
	} `json:"entry"`
}

// IsReadOnlyBatch reports whether body is a FHIR batch Bundle whose entries are
// all GET requests, meaning nothing is written and the response may be cached.
// Malformed, empty, non-batch and non-GET bodies report false.
func IsReadOnlyBatch(body []byte) bool {
	if len(body) == 0 {
		return false
	}
	var bundle readOnlyBundleBody
	if err := json.Unmarshal(body, &bundle); err != nil {
		return false
	}
	if bundle.ResourceType != "Bundle" || bundle.Type != "batch" || len(bundle.Entry) == 0 {
		return false
	}
	for _, entry := range bundle.Entry {
		if entry.Request == nil || !strings.EqualFold(entry.Request.Method, "GET") {
			return false
		}
	}
	return true
}

// parseFHIRPath splits a backend path into the resource type and optional id,
// accepting only /fhir/{Type} and /fhir/{Type}/{id}.
func parseFHIRPath(path string) (string, string) {
	trimmed := strings.Trim(path, "/")
	segments := strings.Split(trimmed, "/")
	if len(segments) < 2 || len(segments) > 3 {
		return "", ""
	}
	if segments[0] != "fhir" {
		return "", ""
	}
	resourceType := segments[1]
	if resourceType == "" {
		return "", ""
	}
	if len(segments) == 3 {
		if segments[2] == "" {
			return "", ""
		}
		return resourceType, segments[2]
	}
	return resourceType, ""
}
