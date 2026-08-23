package service

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
)

func TestDebugCascadeBundles(t *testing.T) {
	// Setup: one specialty with 5 practitioners
	pracIDs := []string{"p1", "p2", "p3", "p4", "p5"}
	level1Bundle := multiRoleSearchset("orthopedics", "Orthopedics", pracIDs)

	bundles := map[string]map[string]any{
		"orthopedics": level1Bundle,
	}

	b := newRecBackend(t, bundles, nil, nil)
	svc := newRecommendationService(t, b)

	levels := buildCascadeURLs("orthopedics", -6.19, 106.8)
	urls := make([]string, len(levels))
	for i, level := range levels {
		urls[i] = practitionerRoleQueryWithNear(level.specialties, -6.19, 106.8, level.radiusKm)
	}

	fetched, err := svc.fetchBatch(context.Background(), urls)
	if err != nil {
		t.Fatalf("fetchBatch error: %v", err)
	}

	for i, bundle := range fetched {
		if bundle == nil {
			t.Logf("Level %d: nil bundle", i)
			continue
		}
		t.Logf("Level %d: %d entries, radiusKm=%d", i, len(bundle.Entry), levels[i].radiusKm)
		for j, entry := range bundle.Entry {
			var meta struct {
				ResourceType string `json:"resourceType"`
				ID           string `json:"id"`
			}
			if err := json.Unmarshal(entry.Resource, &meta); err != nil {
				t.Logf("  Entry %d: unmarshal error: %v", j, err)
			} else {
				t.Logf("  Entry %d: %s/%s", j, meta.ResourceType, meta.ID)
			}
		}
		recs := parseCascadeBundle(bundle, nil, "")
		fmt.Printf("Level %d: %d recs\n", i, len(recs))
	}
}
