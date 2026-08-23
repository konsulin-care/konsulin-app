package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// specialtiesStubBackend serves a PractitionerRole bundle for the
// `_elements=specialty` search with duplicate specialty texts.
func specialtiesStubBackend(t *testing.T) *httptest.Server {
	t.Helper()
	entry := func(id, text string) map[string]any {
		return map[string]any{
			"resource": map[string]any{
				"resourceType": "PractitionerRole",
				"id":           id,
				"specialty": []map[string]any{{
					"coding": []map[string]any{{"code": id, "display": text}},
					"text":   text,
				}},
			},
		}
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/fhir+json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"resourceType": "Bundle",
			"type":         "searchset",
			"total":        3,
			"entry": []map[string]any{
				entry("psychology", "Clinical Psychology"),
				entry("psychiatry", "Psychiatry"),
				entry("psychology", "Clinical Psychology"),
			},
		})
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestRecommendationService_DistinctSpecialties_dedupesAndSorts(t *testing.T) {
	srv := specialtiesStubBackend(t)
	svc := NewRecommendationService(RecommendationOptions{BackendBaseURL: srv.URL, Client: srv.Client()})
	specialties, err := svc.DistinctSpecialties(context.Background())
	if err != nil {
		t.Fatalf("DistinctSpecialties returned error: %v", err)
	}
	got := strings.Join(specialties, ",")
	if got != "Clinical Psychology,Psychiatry" {
		t.Errorf("expected sorted distinct specialties, got %q", got)
	}
}
