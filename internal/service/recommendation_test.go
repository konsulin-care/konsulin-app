package service

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// feeExtension returns the fee extension object used by seeded HealthcareServices.
func feeExtension(value int, currency string) map[string]any {
	return map[string]any{
		"url": "http://konsulin.care/fhir/StructureDefinition/fee",
		"valueMoney": map[string]any{
			"value":    value,
			"currency": currency,
		},
	}
}

// durationExtension returns the appointment-duration extension used in seeds.
func durationExtension(minutes int) map[string]any {
	return map[string]any{
		"url":           "https://konsulin.care/StructureDefinition/appointment-duration",
		"valueDuration": map[string]any{"value": minutes, "unit": "minutes", "code": "min"},
	}
}

// recBackend is a batch-aware FHIR backend stub that counts HTTP requests.
type recBackend struct {
	server *httptest.Server
	hits   int
}

// batchResource wraps one searchset as a successful batch-response entry.
func batchResource(bundle map[string]any) map[string]any {
	return map[string]any{
		"resource": bundle,
		"response": map[string]any{"status": "200"},
	}
}

// nearSearchset wraps the given location entries in a searchset bundle.
func nearSearchset(entries []map[string]any) map[string]any {
	return map[string]any{"resourceType": "Bundle", "type": "searchset", "total": len(entries), "entry": entries}
}

// newRecBackend serves FHIR batch bundles. PractitionerRole searches are routed
// by their specialty param; Location?near routes to near; specialties in fail
// return a non-200 response entry. It counts total HTTP requests in hits.
func newRecBackend(t *testing.T, bundles map[string]map[string]any, near []map[string]any, fail map[string]bool) *recBackend {
	t.Helper()
	b := &recBackend{}
	b.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b.hits++
		w.Header().Set("Content-Type", "application/fhir+json")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Entry []struct {
				Request struct {
					URL string `json:"url"`
				} `json:"request"`
			} `json:"entry"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		entries := []map[string]any{}
		for _, e := range req.Entry {
			u, _ := url.Parse(e.Request.URL)
			specialtyParam := u.Query().Get("specialty")
			hasNear := strings.Contains(e.Request.URL, "near=")
			isLocationQuery := strings.HasPrefix(e.Request.URL, "Location?")
			t.Logf("URL: %s, specialty: %s, hasNear: %v, isLocation: %v", e.Request.URL, specialtyParam, hasNear, isLocationQuery)

			switch {
			// Location?near query for distance extraction
			case isLocationQuery && hasNear:
				entries = append(entries, batchResource(nearSearchset(near)))
			// Cascade URLs: has specialty AND near -> merge bundles for all specialties
			case specialtyParam != "" && hasNear:
				merged := mergeBundles(bundles, specialtyParam)
				entries = append(entries, batchResource(merged))
			case hasNear:
				entries = append(entries, batchResource(nearSearchset(near)))
			case fail[specialtyParam]:
				entries = append(entries, map[string]any{"response": map[string]any{"status": "500"}})
			default:
				merged := mergeBundles(bundles, specialtyParam)
				entries = append(entries, batchResource(merged))
			}
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"resourceType": "Bundle",
			"type":         "batch-response",
			"entry":        entries,
		})
	}))
	t.Cleanup(b.server.Close)
	return b
}

// roleSearchset builds a searchset for one practitioner with one role, one
// location, one service, and one schedule.
func roleSearchset(spec, display string, pracID, roleID, locID, hsID, schID string, fee int) map[string]any {
	return map[string]any{
		"resourceType": "Bundle",
		"type":         "searchset",
		"entry": []map[string]any{
			{"resource": map[string]any{"resourceType": "PractitionerRole", "id": roleID, "active": true,
				"practitioner":      map[string]any{"reference": "Practitioner/" + pracID},
				"location":          []map[string]any{{"reference": "Location/" + locID}},
				"healthcareService": []map[string]any{{"reference": "HealthcareService/" + hsID}},
				"specialty":         []map[string]any{{"coding": []map[string]any{{"system": "http://snomed.info/sct", "code": spec, "display": display}}, "text": display}},
				"availableTime": []map[string]any{{"daysOfWeek": []string{"mon", "tue", "wed", "thu", "fri"},
					"availableStartTime": "09:00:00", "availableEndTime": "17:00:00"}}}},
			{"resource": map[string]any{"resourceType": "Practitioner", "id": pracID, "active": true,
				"name": []map[string]any{{"prefix": []string{"dr."}, "text": "dr. Nama " + pracID}}}},
			{"resource": map[string]any{"resourceType": "Location", "id": locID, "name": "Klinik " + locID,
				"address": map[string]any{"line": []string{"Jl. Test"}, "city": "Jakarta", "district": "Pusat", "state": "DKI Jakarta"}}},
			{"resource": map[string]any{"resourceType": "HealthcareService", "id": hsID, "name": "Layanan " + hsID,
				"type":      []map[string]any{{"coding": []map[string]any{{"code": spec, "display": display}}, "text": display}},
				"extension": []map[string]any{durationExtension(30), feeExtension(fee, "IDR")}}},
			{"resource": map[string]any{"resourceType": "Schedule", "id": schID, "actor": []map[string]any{{"reference": "PractitionerRole/" + roleID}}}},
		},
	}
}

// multiRoleSearchset builds a searchset with one practitioner per id.
func multiRoleSearchset(spec, display string, pracIDs []string) map[string]any {
	var entries []map[string]any
	for _, pracID := range pracIDs {
		roleID := "role-m" + pracID
		entries = append(entries,
			map[string]any{"resource": map[string]any{"resourceType": "PractitionerRole", "id": roleID, "active": true,
				"practitioner":      map[string]any{"reference": "Practitioner/" + pracID},
				"location":          []map[string]any{{"reference": "Location/loc-" + pracID}},
				"healthcareService": []map[string]any{{"reference": "HealthcareService/hs-" + pracID}},
				"specialty":         []map[string]any{{"coding": []map[string]any{{"code": spec, "display": display}}, "text": display}},
				"availableTime": []map[string]any{{"daysOfWeek": []string{"mon"}, "availableStartTime": "09:00:00",
					"availableEndTime": "17:00:00"}}}},
			map[string]any{"resource": map[string]any{"resourceType": "Practitioner", "id": pracID, "name": []map[string]any{{"text": "dr. " + pracID}}}},
			map[string]any{"resource": map[string]any{"resourceType": "Location", "id": "loc-" + pracID, "name": "K" + pracID}},
			map[string]any{"resource": map[string]any{"resourceType": "HealthcareService", "id": "hs-" + pracID, "name": "S" + pracID,
				"type":      []map[string]any{{"coding": []map[string]any{{"code": spec}}, "text": display}},
				"extension": []map[string]any{durationExtension(30), feeExtension(100000, "IDR")}}},
			map[string]any{"resource": map[string]any{"resourceType": "Schedule", "id": "sch-" + pracID, "actor": []map[string]any{{"reference": "PractitionerRole/" + roleID}}}},
		)
	}
	return map[string]any{"resourceType": "Bundle", "type": "searchset", "entry": entries}
}

// mergeBundles combines entries from multiple specialty bundles.
func mergeBundles(bundles map[string]map[string]any, specialtyParam string) map[string]any {
	specialties := strings.Split(specialtyParam, ",")
	var allEntries []any
	for _, spec := range specialties {
		spec = strings.TrimSpace(spec)
		if bnd, ok := bundles[spec]; ok && bnd != nil {
			switch e := bnd["entry"].(type) {
			case []any:
				allEntries = append(allEntries, e...)
			case []map[string]any:
				for _, v := range e {
					allEntries = append(allEntries, v)
				}
			}
		}
	}
	return map[string]any{"resourceType": "Bundle", "type": "searchset", "total": len(allEntries), "entry": allEntries}
}

// psychologySearchset seeds prc-01 with two services so dedup picks the cheaper.
func psychologySearchset() map[string]any {
	return map[string]any{
		"resourceType": "Bundle",
		"type":         "searchset",
		"entry": []map[string]any{
			{"resource": map[string]any{"resourceType": "PractitionerRole", "id": "role-1", "active": true,
				"practitioner": map[string]any{"reference": "Practitioner/prc-01"},
				"location":     []map[string]any{{"reference": "Location/loc-A"}},
				"healthcareService": []map[string]any{
					{"reference": "HealthcareService/hs-1"},
					{"reference": "HealthcareService/hs-2"},
				},
				"specialty":     []map[string]any{{"coding": []map[string]any{{"system": "http://snomed.info/sct", "code": "psychology", "display": "Clinical Psychology"}}, "text": "Clinical Psychology"}},
				"availableTime": []map[string]any{{"daysOfWeek": []string{"mon", "tue", "wed", "thu", "fri"}, "availableStartTime": "09:00:00", "availableEndTime": "17:00:00"}}}},
			{"resource": map[string]any{"resourceType": "Practitioner", "id": "prc-01", "active": true,
				"name": []map[string]any{{"prefix": []string{"dr."}, "text": "dr. Rara Kusuma"}}}},
			{"resource": map[string]any{"resourceType": "Location", "id": "loc-A", "name": "Klinik Senen",
				"address": map[string]any{"line": []string{"Jl. Senen Raya No.1"}, "city": "Jakarta Pusat", "district": "Senen", "state": "DKI Jakarta"}}},
			{"resource": map[string]any{"resourceType": "HealthcareService", "id": "hs-1", "name": "Konsultasi Klinis",
				"type":      []map[string]any{{"coding": []map[string]any{{"code": "psychology", "display": "Clinical Psychology"}}, "text": "Clinical Psychology"}},
				"extension": []map[string]any{durationExtension(30), feeExtension(350000, "IDR")}}},
			{"resource": map[string]any{"resourceType": "HealthcareService", "id": "hs-2", "name": "Terapi CBT",
				"type":      []map[string]any{{"coding": []map[string]any{{"code": "psychology", "display": "Clinical Psychology"}}, "text": "Clinical Psychology"}},
				"extension": []map[string]any{durationExtension(30), feeExtension(400000, "IDR")}}},
			{"resource": map[string]any{"resourceType": "Schedule", "id": "sch-1", "actor": []map[string]any{{"reference": "PractitionerRole/role-1"}}}},
		},
	}
}

// defaultBundles routes each tree specialty to one practitioner, matching the
// decision-tree closeness map used to fill slots to five.
func defaultBundles() map[string]map[string]any {
	return map[string]map[string]any{
		"psychology":       psychologySearchset(),
		"general-practice": roleSearchset("general-practice", "General Practice", "prc-05", "role-5", "loc-E", "hs-5", "sch-5", 50000),
		"orthopedics":      roleSearchset("orthopedics", "Orthopedics", "prc-10", "role-A", "loc-10", "hs-10", "sch-10", 60000),
		"psychiatry":       roleSearchset("psychiatry", "Psychiatry", "prc-02", "role-2", "loc-B", "hs-2", "sch-2", 70000),
		"neuropsychology":  roleSearchset("neuropsychology", "Neuropsychology", "prc-04", "role-4", "loc-D", "hs-4", "sch-4", 80000),
	}
}

// newRecommendationService builds a service bound to the given backing stub.
func newRecommendationService(t *testing.T, b *recBackend) *RecommendationService {
	t.Helper()
	return NewRecommendationService(RecommendationOptions{
		BackendBaseURL: b.server.URL,
		Client:         b.server.Client(),
	})
}

func lat(l float64) *float64 { return &l }

// TestFetchParamsCarriesIntent pins the intent contract fields on FetchParams:
// serviceTypeCode and ICFDomain travel alongside the NUCC specialty, and the
// optional coordinate pointers are preserved.
func TestFetchParamsCarriesIntent(t *testing.T) {
	lat, lon := 1.0, 2.0
	params := FetchParams{
		Specialty:       "2084P0800X",
		ServiceTypeCode: "burnout-care",
		ICFDomain:       "mental-emotional-health",
		Latitude:        &lat,
		Longitude:       &lon,
	}
	if params.Specialty != "2084P0800X" {
		t.Errorf("specialty not preserved: %q", params.Specialty)
	}
	if params.ServiceTypeCode != "burnout-care" {
		t.Errorf("serviceTypeCode not preserved: %q", params.ServiceTypeCode)
	}
	if params.ICFDomain != "mental-emotional-health" {
		t.Errorf("icfDomain not preserved: %q", params.ICFDomain)
	}
	if params.Latitude != &lat || params.Longitude != &lon {
		t.Errorf("coordinate pointers not preserved: %+v", params)
	}
}
