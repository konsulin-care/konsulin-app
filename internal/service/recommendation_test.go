package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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

func roleFixture(id string) map[string]any {
	return map[string]any{
		"resourceType": "PractitionerRole",
		"id":           id,
		"active":       true,
		"practitioner": map[string]any{"reference": "Practitioner/prac-1"},
		"location":     []map[string]any{{"reference": "Location/loc-A"}},
		"healthcareService": []map[string]any{
			{"reference": "HealthcareService/hs-1"},
		},
		"specialty": []map[string]any{{
			"coding": []map[string]any{{"system": "http://snomed.info/sct", "code": "psychology", "display": "Clinical Psychology"}},
			"text":   "Clinical Psychology",
		}},
		"availableTime": []map[string]any{{
			"daysOfWeek":          []string{"mon", "tue", "wed", "thu", "fri"},
			"availableStartTime":  "09:00:00",
			"availableEndTime":    "17:00:00",
		}},
	}
}

// recommendationBackend serves canned FHIR bundles for the aggregation query.
func recommendationBackend(t *testing.T) *httptest.Server {
	t.Helper()

	role1 := roleFixture("role-1")
	role1["location"] = []map[string]any{{"reference": "Location/loc-A"}}
	role1["healthcareService"] = []map[string]any{
		{"reference": "HealthcareService/hs-1"},
		{"reference": "HealthcareService/hs-2"},
	}

	role2 := roleFixture("role-2")
	role2["location"] = []map[string]any{{"reference": "Location/loc-B"}}
	role2["healthcareService"] = []map[string]any{{"reference": "HealthcareService/hs-3"}}

	role3 := roleFixture("role-3")
	role3["practitioner"] = map[string]any{"reference": "Practitioner/prac-2"}
	role3["location"] = []map[string]any{{"reference": "Location/loc-C"}}
	role3["healthcareService"] = []map[string]any{{"reference": "HealthcareService/hs-4"}}

	roleBundle := map[string]any{
		"resourceType": "Bundle",
		"type":         "searchset",
		"total":        3,
		"entry": []map[string]any{
			{"resource": role1},
			{"resource": role2},
			{"resource": role3},
			{"resource": map[string]any{"resourceType": "Practitioner", "id": "prac-1", "active": true,
				"name": []map[string]any{{"prefix": []string{"dr."}, "text": "dr. Rara Kusuma"}}}},
			{"resource": map[string]any{"resourceType": "Practitioner", "id": "prac-2", "active": true,
				"name": []map[string]any{{"prefix": []string{"dr."}, "text": "dr. Budi Santoso"}}}},
			{"resource": map[string]any{"resourceType": "Location", "id": "loc-A", "status": "active",
				"name":    "Cabang Senen",
				"address": map[string]any{"line": []string{"Jl. Senen Raya No. 1"}, "city": "Jakarta Pusat", "district": "Senen", "state": "DKI Jakarta"}}},
			{"resource": map[string]any{"resourceType": "Location", "id": "loc-B", "status": "active",
				"name":    "Cabang Kebayoran Baru",
				"address": map[string]any{"line": []string{"Jl. Pangeran Antasari No. 10"}, "city": "Jakarta Selatan", "district": "Kebayoran Baru", "state": "DKI Jakarta"}}},
			{"resource": map[string]any{"resourceType": "Location", "id": "loc-C", "status": "active",
				"name":    "Cabang Bekasi",
				"address": map[string]any{"line": []string{"Jl. Ahmad Yani No. 44"}, "city": "Kota Bekasi", "district": "Bekasi Selatan", "state": "Jawa Barat"}}},
			{"resource": map[string]any{"resourceType": "HealthcareService", "id": "hs-1", "active": true, "name": "Konsultasi Psikologi Klinis",
				"type": []map[string]any{{"coding": []map[string]any{{"code": "psychology", "display": "Clinical Psychology"}}, "text": "Clinical Psychology"}},
				"extension": []map[string]any{durationExtension(30), feeExtension(350000, "IDR")}}},
			{"resource": map[string]any{"resourceType": "HealthcareService", "id": "hs-2", "active": true, "name": "Terapi Konseling CBT",
				"type": []map[string]any{{"coding": []map[string]any{{"code": "psychology", "display": "Clinical Psychology"}}, "text": "Clinical Psychology"}},
				"extension": []map[string]any{durationExtension(30), feeExtension(400000, "IDR")}}},
			{"resource": map[string]any{"resourceType": "HealthcareService", "id": "hs-3", "active": true, "name": "Konsultasi Singkat",
				"type": []map[string]any{{"coding": []map[string]any{{"code": "psychology", "display": "Clinical Psychology"}}, "text": "Clinical Psychology"}},
				"extension": []map[string]any{durationExtension(30), feeExtension(300000, "IDR")}}},
			{"resource": map[string]any{"resourceType": "HealthcareService", "id": "hs-4", "active": true, "name": "Konsultasi Psikiatri",
				"type": []map[string]any{{"coding": []map[string]any{{"code": "psychiatry", "display": "Psychiatry"}}, "text": "Psychiatry"}},
				"extension": []map[string]any{durationExtension(30), feeExtension(400000, "IDR")}}},
			{"resource": map[string]any{"resourceType": "Schedule", "id": "sch-1", "active": true,
				"actor": []map[string]any{{"reference": "PractitionerRole/role-1"}}}},
			{"resource": map[string]any{"resourceType": "Schedule", "id": "sch-2", "active": true,
				"actor": []map[string]any{{"reference": "PractitionerRole/role-2"}}}},
			{"resource": map[string]any{"resourceType": "Schedule", "id": "sch-3", "active": true,
				"actor": []map[string]any{{"reference": "PractitionerRole/role-3"}}}},
		},
	}

	// nearResponse serves two locations within the radius, with distance in meters.
	nearBundle := map[string]any{
		"resourceType": "Bundle",
		"type":         "searchset",
		"total":        2,
		"entry": []map[string]any{
			{"resource": map[string]any{"resourceType": "Location", "id": "loc-A", "status": "active", "name": "Cabang Senen"},
				"search": map[string]any{"extension": []map[string]any{{
					"url":           "http://hl7.org/fhir/StructureDefinition/location-distance",
					"valueDistance": map[string]any{"value": 5000.0, "unit": "m", "code": "m"},
				}}}},
			{"resource": map[string]any{"resourceType": "Location", "id": "loc-B", "status": "active", "name": "Cabang Kebayoran Baru"},
				"search": map[string]any{"extension": []map[string]any{{
					"url":           "http://hl7.org/fhir/StructureDefinition/location-distance",
					"valueDistance": map[string]any{"value": 3000.0, "unit": "m", "code": "m"},
				}}}},
		},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/fhir+json")
		switch {
		case strings.Contains(r.URL.Path, "PractitionerRole"):
			_ = json.NewEncoder(w).Encode(roleBundle)
		case strings.Contains(r.URL.Path, "Location") && strings.Contains(r.URL.RawQuery, "near="):
			_ = json.NewEncoder(w).Encode(nearBundle)
		default:
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(map[string]any{"resourceType": "OperationOutcome"})
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func newRecommendationService(t *testing.T) *RecommendationService {
	t.Helper()
	srv := recommendationBackend(t)
	return NewRecommendationService(RecommendationOptions{
		BackendBaseURL: srv.URL,
		Client:         srv.Client(),
	})
}

func lat(l float64) *float64 { return &l }

func TestRecommendationService_Fetch_joinsAcrossResourceTypes(t *testing.T) {
	svc := newRecommendationService(t)
	recs, err := svc.Fetch(context.Background(), FetchParams{Specialty: "psychology"})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}

	// Two practitioners match; each practitioner yields exactly one card after dedup.
	if len(recs) != 2 {
		t.Fatalf("expected 2 recommendations, got %d", len(recs))
	}

	prac1 := recs[0]
	if prac1.PractitionerID != "Practitioner/prac-1" {
		t.Errorf("expected practitioner prac-1, got %s", prac1.PractitionerID)
	}
	if prac1.PractitionerName != "dr. Rara Kusuma" {
		t.Errorf("expected name dr. Rara Kusuma, got %s", prac1.PractitionerName)
	}
	if prac1.ScheduleID != "Schedule/sch-2" {
		t.Errorf("expected schedule sch-2 (via _revinclude) for the deduped role, got %s", prac1.ScheduleID)
	}
	if prac1.HealthcareServiceID != "HealthcareService/hs-3" {
		t.Errorf("expected lowest-fee service hs-3, got %s", prac1.HealthcareServiceID)
	}
	if prac1.Fee != 300000 || prac1.Currency != "IDR" {
		t.Errorf("expected fee 300000 IDR, got %d %s", prac1.Fee, prac1.Currency)
	}
	if prac1.DurationMinutes != 30 {
		t.Errorf("expected duration 30 minutes, got %d", prac1.DurationMinutes)
	}
	if prac1.LocationID != "Location/loc-B" {
		t.Errorf("expected location loc-B, got %s", prac1.LocationID)
	}
	if len(prac1.Specialties) != 1 || prac1.Specialties[0] != "Clinical Psychology" {
		t.Errorf("expected specialty display, got %v", prac1.Specialties)
	}
	if len(prac1.AvailableTime) != 1 {
		t.Fatalf("expected availableTime carried for next-slot computation, got %d windows", len(prac1.AvailableTime))
	}
	if prac1.NextSlot != nil {
		t.Errorf("expected nextSlot unset at aggregation stage, got %v", prac1.NextSlot)
	}
	if prac1.DistanceKm != nil {
		t.Errorf("expected distanceKm nil without lat/lon, got %v", *prac1.DistanceKm)
	}
}

func TestRecommendationService_Fetch_dedupsByPractitioner(t *testing.T) {
	svc := newRecommendationService(t)
	recs, err := svc.Fetch(context.Background(), FetchParams{Specialty: "psychology"})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}

	seen := map[string]bool{}
	for _, r := range recs {
		if seen[r.PractitionerID] {
			t.Errorf("practitioner %s appears more than once", r.PractitionerID)
		}
		seen[r.PractitionerID] = true
	}
}

func TestRecommendationService_Fetch_proximityFiltersAndExtractsDistance(t *testing.T) {
	svc := newRecommendationService(t)
	recs, err := svc.Fetch(context.Background(), FetchParams{
		Specialty: "psychology",
		Latitude:  lat(-6.2),
		Longitude: lat(106.8),
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}

	// loc-C is outside the near set, so prac-2 (role-3) is dropped.
	if len(recs) != 1 {
		t.Fatalf("expected 1 recommendation after proximity filter, got %d", len(recs))
	}
	r := recs[0]
	if r.PractitionerID != "Practitioner/prac-1" {
		t.Errorf("expected prac-1, got %s", r.PractitionerID)
	}
	if r.DistanceKm == nil {
		t.Fatal("expected distanceKm set from valueDistance")
	}
	// valueDistance is in meters; exposed as km via unit conversion only.
	if *r.DistanceKm != 3.0 {
		t.Errorf("expected distanceKm 3.0, got %v", *r.DistanceKm)
	}
}

func TestRecommendationService_Fetch_backendError(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"boom"}`))
	}))
	t.Cleanup(backend.Close)

	svc := NewRecommendationService(RecommendationOptions{BackendBaseURL: backend.URL, Client: backend.Client()})
	if _, err := svc.Fetch(context.Background(), FetchParams{Specialty: "psychology"}); err == nil {
		t.Fatal("expected error when backend returns 500")
	}
}