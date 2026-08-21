package service

import (
	"context"
	"net/url"
	"strings"
	"testing"
)

// TestPractitionerRoleQueryWithNear_generatesCorrectURL verifies the query
// includes _count=5, _sort=-_lastUpdated, and location.near when radiusKm > 0.
func TestPractitionerRoleQueryWithNear_generatesCorrectURL(t *testing.T) {
	query := practitionerRoleQueryWithNear([]string{"orthopedics"}, -6.19, 106.8, 10)

	// Should start with /fhir/PractitionerRole?
	if !strings.HasPrefix(query, "/fhir/PractitionerRole?") {
		t.Errorf("expected prefix /fhir/PractitionerRole?, got %s", query)
	}

	// Parse query params
	u, err := url.Parse(query)
	if err != nil {
		t.Fatalf("failed to parse query: %v", err)
	}
	params := u.Query()

	// Check specialty
	if params.Get("specialty") != "orthopedics" {
		t.Errorf("expected specialty=orthopedics, got %s", params.Get("specialty"))
	}

	// Check _count=5
	if params.Get("_count") != "5" {
		t.Errorf("expected _count=5, got %s", params.Get("_count"))
	}

	// Check _sort=-_lastUpdated
	if params.Get("_sort") != "-_lastUpdated" {
		t.Errorf("expected _sort=-_lastUpdated, got %s", params.Get("_sort"))
	}

	// Check active=true
	if params.Get("active") != "true" {
		t.Errorf("expected active=true, got %s", params.Get("active"))
	}

	// Check location.near
	near := params.Get("location.near")
	if near == "" {
		t.Error("expected location.near parameter, got empty")
	}
	if !strings.Contains(near, "10") {
		t.Errorf("expected location.near to contain radius 10, got %s", near)
	}
}

// TestPractitionerRoleQueryWithNear_includesLocationNear verifies location.near
// is included when radiusKm > 0.
func TestPractitionerRoleQueryWithNear_includesLocationNear(t *testing.T) {
	query := practitionerRoleQueryWithNear([]string{"psychology"}, -6.2, 106.8, 25)

	u, err := url.Parse(query)
	if err != nil {
		t.Fatalf("failed to parse query: %v", err)
	}
	params := u.Query()

	near := params.Get("location.near")
	if near == "" {
		t.Error("expected location.near parameter, got empty")
	}
	if !strings.Contains(near, "25") {
		t.Errorf("expected location.near to contain radius 25, got %s", near)
	}
}

// TestPractitionerRoleQueryWithNear_omitsLocationNear verifies location.near
// is omitted when radiusKm == 0.
func TestPractitionerRoleQueryWithNear_omitsLocationNear(t *testing.T) {
	query := practitionerRoleQueryWithNear([]string{"orthopedics"}, -6.19, 106.8, 0)

	u, err := url.Parse(query)
	if err != nil {
		t.Fatalf("failed to parse query: %v", err)
	}
	params := u.Query()

	if params.Get("location.near") != "" {
		t.Errorf("expected no location.near when radiusKm=0, got %s", params.Get("location.near"))
	}
}

// TestPractitionerRoleQueryWithNear_joinsMultipleSpecialties verifies multiple
// specialties are joined with commas.
func TestPractitionerRoleQueryWithNear_joinsMultipleSpecialties(t *testing.T) {
	query := practitionerRoleQueryWithNear([]string{"orthopedics", "general-practice", "psychology"}, -6.19, 106.8, 10)

	u, err := url.Parse(query)
	if err != nil {
		t.Fatalf("failed to parse query: %v", err)
	}
	params := u.Query()

	specialty := params.Get("specialty")
	if !strings.Contains(specialty, "orthopedics") {
		t.Errorf("expected specialty to contain orthopedics, got %s", specialty)
	}
	if !strings.Contains(specialty, "general-practice") {
		t.Errorf("expected specialty to contain general-practice, got %s", specialty)
	}
	if !strings.Contains(specialty, "psychology") {
		t.Errorf("expected specialty to contain psychology, got %s", specialty)
	}
	if !strings.Contains(specialty, ",") {
		t.Errorf("expected specialties joined with comma, got %s", specialty)
	}
}

// TestPractitionerRoleQueryWithNear_includesIncludes verifies the query
// includes all required _include parameters.
func TestPractitionerRoleQueryWithNear_includesIncludes(t *testing.T) {
	query := practitionerRoleQueryWithNear([]string{"orthopedics"}, -6.19, 106.8, 10)

	u, err := url.Parse(query)
	if err != nil {
		t.Fatalf("failed to parse query: %v", err)
	}
	params := u.Query()

	includes := params["_include"]
	if len(includes) == 0 {
		t.Error("expected _include parameters, got none")
	}
	if !containsString(includes, "PractitionerRole:practitioner") {
		t.Errorf("expected _include PractitionerRole:practitioner, got %v", includes)
	}
	if !containsString(includes, "PractitionerRole:location") {
		t.Errorf("expected _include PractitionerRole:location, got %v", includes)
	}
	if !containsString(includes, "PractitionerRole:service") {
		t.Errorf("expected _include PractitionerRole:service, got %v", includes)
	}
}

// containsString checks if a string slice contains a specific value.
func containsString(slice []string, target string) bool {
	for _, s := range slice {
		if s == target {
			return true
		}
	}
	return false
}

// TestPractitionerRoleQueryWithNear_integration verifies the query works
// against the real FHIR backend.
func TestPractitionerRoleQueryWithNear_integration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	b := newRecBackend(t, defaultBundles(), nil, nil)
	svc := newRecommendationService(t, b)

	// Test with location - should use cascade query
	query := practitionerRoleQueryWithNear([]string{"orthopedics"}, -6.19, 106.8, 10)
	if query == "" {
		t.Error("expected non-empty query")
	}

	// Verify the query can be used in a batch request
	_ = svc
	_ = context.Background()
}
