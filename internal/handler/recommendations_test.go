package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// recStub builds the FHIR backend used by the recommendations handler tests:
// six practitioners, each with one role/service/location/schedule.
func recStub(t *testing.T, emptyRoles bool) *httptest.Server {
	t.Helper()

	roleEntry := func(i int) map[string]any {
		num := string(rune('1' + i))
		return map[string]any{
			"resource": map[string]any{
				"resourceType":      "PractitionerRole",
				"id":                "role-" + num,
				"active":            true,
				"practitioner":      map[string]any{"reference": "Practitioner/prac-" + num},
				"organization":      map[string]any{"reference": "Organization/org-1"},
				"location":          []map[string]any{{"reference": "Location/loc-" + num}},
				"healthcareService": []map[string]any{{"reference": "HealthcareService/hs-" + num}},
				"specialty": []map[string]any{{
					"coding": []map[string]any{{"system": "http://snomed.info/sct", "code": "psychology", "display": "Clinical Psychology"}},
					"text":   "Clinical Psychology",
				}},
				"availableTime": []map[string]any{{
					"daysOfWeek":         []string{"mon", "tue", "wed", "thu", "fri"},
					"availableStartTime": "09:00:00",
					"availableEndTime":   "17:00:00",
				}},
			},
		}
	}

	type packed = map[string]any
	entries := []packed{}
	if !emptyRoles {
		for i := 0; i < 6; i++ {
			num := string(rune('1' + i))
			entries = append(entries,
				roleEntry(i),
				packed{"resource": packed{"resourceType": "Practitioner", "id": "prac-" + num, "name": []packed{{"text": "dr. Dokter " + num}}}},
				packed{"resource": packed{"resourceType": "Location", "id": "loc-" + num, "name": "Lokasi " + num,
					"address": packed{"line": []string{"Jl. Test No. " + num}, "city": "Kota Test", "district": "Kec Test", "state": "Provinsi Test"}}},
				packed{"resource": packed{"resourceType": "HealthcareService", "id": "hs-" + num, "name": "Layanan " + num,
					"type": []packed{{"coding": []packed{{"code": "psychology", "display": "Clinical Psychology"}}, "text": "Clinical Psychology"}},
					"extension": []packed{
						packed{"url": "https://konsulin.care/StructureDefinition/appointment-duration", "valueDuration": packed{"value": 30}},
						packed{"url": "http://konsulin.care/fhir/StructureDefinition/fee", "valueMoney": packed{"value": 200000, "currency": "IDR"}},
					}}},
				packed{"resource": packed{"resourceType": "Schedule", "id": "sch-" + num, "actor": []packed{{"reference": "PractitionerRole/role-" + num}}}},
			)
		}
	}

	nearEntries := []packed{}
	for i := 0; i < 6; i++ {
		num := string(rune('1' + i))
		nearEntries = append(nearEntries, packed{
			"resource": packed{"resourceType": "Location", "id": "loc-" + num, "name": "Lokasi " + num},
			"search": packed{"extension": []packed{{"url": "http://hl7.org/fhir/StructureDefinition/location-distance",
				"valueDistance": packed{"value": 1000 + float64(i)*250, "unit": "m", "code": "m"}}}},
		})
	}

	specialtyEntries := []packed{
		packed{"resource": packed{"resourceType": "PractitionerRole", "id": "role-1", "specialty": []packed{{"coding": []packed{{"code": "psychology", "display": "Clinical Psychology"}}, "text": "Clinical Psychology"}}}},
		packed{"resource": packed{"resourceType": "PractitionerRole", "id": "role-2", "specialty": []packed{{"coding": []packed{{"code": "psychiatry", "display": "Psychiatry"}}, "text": "Psychiatry"}}}},
		packed{"resource": packed{"resourceType": "PractitionerRole", "id": "role-3", "specialty": []packed{{"coding": []packed{{"code": "psychology", "display": "Clinical Psychology"}}, "text": "Clinical Psychology"}}}},
	}

	// bundleForSearchURL returns the flat searchset bundle a GET to the given
	// relative URL (e.g. "PractitionerRole?...") would produce.
	bundleForSearchURL := func(entryURL string) packed {
		switch {
		case strings.Contains(entryURL, "Slot"):
			return packed{"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []packed{}}
		case strings.Contains(entryURL, "_elements=specialty"):
			return packed{"resourceType": "Bundle", "type": "searchset", "total": 3, "entry": specialtyEntries}
		case strings.Contains(entryURL, "Location") && strings.Contains(entryURL, "near="):
			return packed{"resourceType": "Bundle", "type": "searchset", "total": 6, "entry": nearEntries}
		default:
			return packed{"resourceType": "Bundle", "type": "searchset", "total": len(entries), "entry": entries}
		}
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/fhir+json")

		// FHIR batch POST — decode entry URLs and route each one.
		if r.Method == http.MethodPost {
			var batchReq struct {
				Entry []struct {
					Request struct {
						URL string `json:"url"`
					} `json:"request"`
				} `json:"entry"`
			}
			if err := json.NewDecoder(r.Body).Decode(&batchReq); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			respEntries := make([]packed, 0, len(batchReq.Entry))
			for _, e := range batchReq.Entry {
				respEntries = append(respEntries, packed{
					"resource": bundleForSearchURL(e.Request.URL),
					"response": packed{"status": "200"},
				})
			}
			_ = json.NewEncoder(w).Encode(packed{
				"resourceType": "Bundle",
				"type":         "batch-response",
				"entry":        respEntries,
			})
			return
		}

		// Legacy GET fallback.
		_ = json.NewEncoder(w).Encode(bundleForSearchURL(r.URL.Path + "?" + r.URL.RawQuery))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func recHandler(t *testing.T, emptyRoles bool) *RecommendationsHandler {
	t.Helper()
	srv := recStub(t, emptyRoles)
	return NewRecommendationsHandler(RecommendationsOptions{
		BackendBaseURL: srv.URL,
		Client:         srv.Client(),
	})
}

func getRecommendations(t *testing.T, h *RecommendationsHandler, query string) (int, map[string]any) {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(h.Recommendations))
	t.Cleanup(server.Close)
	resp, err := http.Get(server.URL + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var body map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&body)
	return resp.StatusCode, body
}

func TestRecommendationsHandler_missingSpecialty(t *testing.T) {
	code, _ := getRecommendations(t, recHandler(t, false), "")
	if code != http.StatusBadRequest {
		t.Errorf("expected 400 without specialty, got %d", code)
	}
}

func TestRecommendationsHandler_returnsFiveCards(t *testing.T) {
	code, body := getRecommendations(t, recHandler(t, false), "/api/recommendations?specialty=psychology&lat=-6.2&lon=106.8")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if body["specialty"] != "psychology" {
		t.Errorf("expected specialty echo, got %v", body["specialty"])
	}
	recs, ok := body["recommendations"].([]any)
	if !ok {
		t.Fatalf("expected recommendations array, got %v", body["recommendations"])
	}
	if len(recs) != 5 {
		t.Fatalf("expected 5 sampled cards from 6 candidates, got %d", len(recs))
	}
	for _, raw := range recs {
		card, ok := raw.(map[string]any)
		if !ok {
			t.Fatalf("expected card object, got %v", raw)
		}
		assertRecommendationCard(t, card)
	}
}

// assertRecommendationCard verifies the pre-joined fields of one card.
func assertRecommendationCard(t *testing.T, card map[string]any) {
	t.Helper()
	for field, want := range map[string]string{
		"practitionerName":    "",
		"scheduleId":          "sch-",
		"healthcareServiceId": "hs-",
		"locationId":          "loc-",
	} {
		val, _ := card[field].(string)
		if val == "" || (want != "" && !strings.HasPrefix(val, want)) {
			t.Errorf("card field %s invalid: %q (want prefix %q)", field, val, want)
		}
	}
	fee, _ := card["fee"].(float64)
	if fee != 200000 {
		t.Errorf("expected fee 200000, got %v", card["fee"])
	}
	if card["currency"] != "IDR" {
		t.Errorf("expected IDR, got %v", card["currency"])
	}
	if card["locationName"] == "" {
		t.Error("expected locationName on card")
	}
	if card["distanceKm"] == nil {
		t.Error("expected distanceKm when lat/lon provided")
	}
}

func TestRecommendationsHandler_emptyResults(t *testing.T) {
	code, body := getRecommendations(t, recHandler(t, true), "/api/recommendations?specialty=psychology")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	recs, ok := body["recommendations"].([]any)
	if !ok {
		t.Fatalf("expected empty array (not null), got %v", body["recommendations"])
	}
	if len(recs) != 0 {
		t.Errorf("expected zero cards, got %d", len(recs))
	}
}

func TestRecommendationsHandler_acceptsIntentParams(t *testing.T) {
	code, _ := getRecommendations(t, recHandler(t, false),
		"/api/recommendations?specialty=psychology&serviceTypeCode=counseling-care&icfDomain=mental-emotional-health&lat=-6.2&lon=106.8")
	if code != http.StatusOK {
		t.Fatalf("expected 200 with intent params, got %d", code)
	}
}

// TestRecommendationsHandler_methodNotAllowed verifies POST is rejected.
func TestRecommendationsHandler_methodNotAllowed(t *testing.T) {
	h := recHandler(t, false)
	server := httptest.NewServer(http.HandlerFunc(h.Recommendations))
	t.Cleanup(server.Close)
	resp, err := http.Post(server.URL+"/api/recommendations?specialty=psychology", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", resp.StatusCode)
	}
}

func TestRecommendationsHandler_specialties(t *testing.T) {
	h := recHandler(t, false)
	server := httptest.NewServer(http.HandlerFunc(h.Specialties))
	t.Cleanup(server.Close)
	resp, err := http.Get(server.URL + "/api/recommendations/specialties")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var body map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&body)
	specs, ok := body["specialties"].([]any)
	if !ok {
		t.Fatalf("expected specialties array, got %v", body["specialties"])
	}
	if len(specs) != 2 || specs[0] != "Clinical Psychology" || specs[1] != "Psychiatry" {
		t.Errorf("expected sorted distinct list, got %v", specs)
	}
}

// TestRecommendationsHandler_deterministic verifies that two requests with
// the same input return identical results (no random sampling).
func TestRecommendationsHandler_deterministic(t *testing.T) {
	h := recHandler(t, false)

	fetchCards := func() []map[string]any {
		t.Helper()
		_, body := getRecommendations(t, h, "/api/recommendations?specialty=psychology")
		recs, _ := body["recommendations"].([]any)
		cards := make([]map[string]any, 0, len(recs))
		for _, r := range recs {
			cards = append(cards, r.(map[string]any))
		}
		return cards
	}

	first := fetchCards()
	second := fetchCards()

	if len(first) != len(second) {
		t.Fatalf("length mismatch: %d vs %d", len(first), len(second))
	}
	for i := range first {
		if first[i]["practitionerRoleId"] != second[i]["practitionerRoleId"] {
			t.Errorf("card %d: %v != %v", i, first[i]["practitionerRoleId"], second[i]["practitionerRoleId"])
		}
	}
}
