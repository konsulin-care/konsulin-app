package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// TestRecommendationsHandler_batchedEnrichment verifies that slot enrichment
// fires one additional batch POST (not separate GETs per practitioner).
func TestRecommendationsHandler_batchedEnrichment(t *testing.T) {
	var postCount int
	var mu sync.Mutex

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/fhir+json")

		if r.Method == http.MethodPost && r.URL.Path == "/fhir" {
			mu.Lock()
			postCount++
			mu.Unlock()

			var batch struct {
				Entry []struct {
					Request struct {
						URL string `json:"url"`
					} `json:"request"`
				} `json:"entry"`
			}
			_ = json.NewDecoder(r.Body).Decode(&batch)

			respEntries := make([]map[string]any, 0, len(batch.Entry))
			for _, e := range batch.Entry {
				if strings.Contains(e.Request.URL, "Slot") {
					// Return empty Slot bundle (no busy slots)
					respEntries = append(respEntries, map[string]any{
						"resource": map[string]any{"resourceType": "Bundle", "type": "searchset", "entry": []any{}},
						"response": map[string]any{"status": "200"},
					})
				} else {
					// Return role bundle with one practitioner
					respEntries = append(respEntries, map[string]any{
						"resource": map[string]any{
							"resourceType": "Bundle",
							"type":         "searchset",
							"total":        1,
							"entry": []map[string]any{
								{"resource": map[string]any{"resourceType": "PractitionerRole", "id": "role-1", "active": true, "practitioner": map[string]any{"reference": "Practitioner/prac-1"}, "location": []map[string]any{{"reference": "Location/loc-1"}}, "healthcareService": []map[string]any{{"reference": "HealthcareService/hs-1"}}, "specialty": []map[string]any{{"coding": []map[string]any{{"code": "psychology"}}, "text": "Psychology"}}, "availableTime": []map[string]any{{"daysOfWeek": []string{"mon", "tue", "wed", "thu", "fri"}, "availableStartTime": "09:00:00", "availableEndTime": "17:00:00"}}}},
								{"resource": map[string]any{"resourceType": "Practitioner", "id": "prac-1", "name": []map[string]any{{"text": "dr. 1"}}}},
								{"resource": map[string]any{"resourceType": "Location", "id": "loc-1", "name": "Klinik 1", "address": map[string]any{"line": []string{"Jl. 1"}, "city": "Jakarta"}}},
								{"resource": map[string]any{"resourceType": "HealthcareService", "id": "hs-1", "name": "Layanan 1", "type": []map[string]any{{"coding": []map[string]any{{"code": "psychology"}}}}, "extension": []map[string]any{{"url": "http://konsulin.care/fhir/StructureDefinition/fee", "valueMoney": map[string]any{"value": 200000, "currency": "IDR"}}, {"url": "https://konsulin.care/StructureDefinition/appointment-duration", "valueDuration": map[string]any{"value": 30, "unit": "minutes", "code": "min"}}}}},
								{"resource": map[string]any{"resourceType": "Schedule", "id": "sch-1", "actor": []map[string]any{{"reference": "PractitionerRole/role-1"}}}},
							},
						},
						"response": map[string]any{"status": "200"},
					})
				}
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"resourceType": "Bundle", "type": "batch-response", "entry": respEntries})
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	}))
	t.Cleanup(srv.Close)

	h := NewRecommendationsHandler(RecommendationsOptions{
		BackendBaseURL: srv.URL,
		Client:         srv.Client(),
	})

	server := httptest.NewServer(http.HandlerFunc(h.Recommendations))
	t.Cleanup(server.Close)

	resp, err := http.Get(server.URL + "/api/recommendations?specialty=psychology")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	var body map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&body)

	recs, _ := body["recommendations"].([]any)
	if len(recs) == 0 {
		t.Fatal("expected at least 1 recommendation")
	}

	// First card should have nextSlot (empty slot bundle = first window is free)
	card := recs[0].(map[string]any)
	if card["nextSlot"] == nil {
		t.Error("expected nextSlot on first card")
	}

	// Budget: at most 3 POST /fhir per load — the specialties batch, the
	// conditional fallback-fill batch (when the exact+related pool is short),
	// and the slot-enrichment batch. A fully-populated load stays at 2.
	mu.Lock()
	defer mu.Unlock()
	if postCount > 3 {
		t.Errorf("expected at most 3 FHIR batch POSTs, got %d", postCount)
	}
}
