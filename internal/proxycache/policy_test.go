package proxycache

import "testing"

func TestCacheKeyCanonical(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		rawQuery string
		want     string
	}{
		{
			name:     "sorts keys and values",
			path:     "/fhir/Questionnaire",
			rawQuery: "b=2&a=z&a=a&c=1",
			want:     "/fhir/Questionnaire?a=a&a=z&b=2&c=1",
		},
		{
			name:     "empty query",
			path:     "/fhir/ValueSet",
			rawQuery: "",
			want:     "/fhir/ValueSet?",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := CacheKey(tc.path, tc.rawQuery); got != tc.want {
				t.Fatalf("CacheKey(%q, %q) = %q, want %q", tc.path, tc.rawQuery, got, tc.want)
			}
		})
	}

	first := CacheKey("/fhir/Questionnaire", "status=active&code=phq-9&_count=20")
	second := CacheKey("/fhir/Questionnaire", "_count=20&code=phq-9&status=active")
	if first != second {
		t.Fatalf("expected order-independent keys, got %q and %q", first, second)
	}
}

func TestCacheable(t *testing.T) {
	tests := []struct {
		name     string
		method   string
		path     string
		rawQuery string
		wantType string
		wantOK   bool
	}{
		{name: "questionnaire search", method: "GET", path: "/fhir/Questionnaire", rawQuery: "status=active", wantType: "Questionnaire", wantOK: true},
		{name: "research study read", method: "GET", path: "/fhir/ResearchStudy/abc", wantType: "ResearchStudy", wantOK: true},
		{name: "organization", method: "GET", path: "/fhir/Organization", wantType: "Organization", wantOK: true},
		{name: "healthcare service", method: "GET", path: "/fhir/HealthcareService", wantType: "HealthcareService", wantOK: true},
		{name: "location", method: "GET", path: "/fhir/Location", wantType: "Location", wantOK: true},
		{name: "media", method: "GET", path: "/fhir/Media", wantType: "Media", wantOK: true},
		{name: "code system", method: "GET", path: "/fhir/CodeSystem", wantType: "CodeSystem", wantOK: true},
		{name: "value set", method: "GET", path: "/fhir/ValueSet", wantType: "ValueSet", wantOK: true},
		{name: "practitioner role without actor", method: "GET", path: "/fhir/PractitionerRole", rawQuery: "specialty=cardio", wantType: "PractitionerRole", wantOK: true},
		{name: "practitioner role with practitioner", method: "GET", path: "/fhir/PractitionerRole", rawQuery: "practitioner=Practitioner/abc"},
		{name: "practitioner role with actor", method: "GET", path: "/fhir/PractitionerRole", rawQuery: "actor=Practitioner/abc"},
		{name: "questionnaire response count", method: "GET", path: "/fhir/QuestionnaireResponse", rawQuery: "_summary=count", wantType: "QuestionnaireResponse", wantOK: true},
		{name: "questionnaire response search", method: "GET", path: "/fhir/QuestionnaireResponse", rawQuery: "status=completed"},
		{name: "research subject count", method: "GET", path: "/fhir/ResearchSubject", rawQuery: "_summary=count", wantType: "ResearchSubject", wantOK: true},
		{name: "research subject search", method: "GET", path: "/fhir/ResearchSubject", rawQuery: "status=active"},
		{name: "post rejected", method: "POST", path: "/fhir/Questionnaire"},
		{name: "slot rejected", method: "GET", path: "/fhir/Slot"},
		{name: "schedule rejected", method: "GET", path: "/fhir/Schedule"},
		{name: "appointment rejected", method: "GET", path: "/fhir/Appointment"},
		{name: "practitioner rejected", method: "GET", path: "/fhir/Practitioner"},
		{name: "patient rejected", method: "GET", path: "/fhir/Patient"},
		{name: "author identity param", method: "GET", path: "/fhir/Questionnaire", rawQuery: "author=Practitioner/abc"},
		{name: "identifier identity param", method: "GET", path: "/fhir/Questionnaire", rawQuery: "identifier=abc"},
		{name: "subject identity param", method: "GET", path: "/fhir/ResearchStudy", rawQuery: "subject=Patient/abc"},
		{name: "patient identity param", method: "GET", path: "/fhir/Questionnaire", rawQuery: "patient=Patient/abc"},
		{name: "individual identity param", method: "GET", path: "/fhir/Questionnaire", rawQuery: "individual=Patient/abc"},
		{name: "performer identity param", method: "GET", path: "/fhir/Questionnaire", rawQuery: "performer=Practitioner/abc"},
		{name: "participant identity param", method: "GET", path: "/fhir/Questionnaire", rawQuery: "participant=Practitioner/abc"},
		{name: "has identity param", method: "GET", path: "/fhir/Questionnaire", rawQuery: "_has:Observation:subject:code=abc"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			gotType, gotOK := Cacheable(tc.method, tc.path, tc.rawQuery)
			if gotOK != tc.wantOK {
				t.Fatalf("Cacheable(%q, %q, %q) ok = %v, want %v", tc.method, tc.path, tc.rawQuery, gotOK, tc.wantOK)
			}
			if gotType != tc.wantType {
				t.Fatalf("Cacheable(%q, %q, %q) type = %q, want %q", tc.method, tc.path, tc.rawQuery, gotType, tc.wantType)
			}
		})
	}
}

func TestInvalidationType(t *testing.T) {
	tests := []struct {
		name     string
		method   string
		path     string
		wantType string
		wantOK   bool
	}{
		{name: "post type", method: "POST", path: "/fhir/Questionnaire", wantType: "Questionnaire", wantOK: true},
		{name: "put instance", method: "PUT", path: "/fhir/Questionnaire/abc", wantType: "Questionnaire", wantOK: true},
		{name: "patch instance", method: "PATCH", path: "/fhir/Questionnaire/abc", wantType: "Questionnaire", wantOK: true},
		{name: "delete instance", method: "DELETE", path: "/fhir/Questionnaire/abc", wantType: "Questionnaire", wantOK: true},
		{name: "bundle post", method: "POST", path: "/fhir", wantType: "*", wantOK: true},
		{name: "bundle post trailing slash", method: "POST", path: "/fhir/", wantType: "*", wantOK: true},
		{name: "get not invalidating", method: "GET", path: "/fhir/Questionnaire"},
		{name: "post other path", method: "POST", path: "/auth/login"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			gotType, gotOK := InvalidationType(tc.method, tc.path)
			if gotOK != tc.wantOK {
				t.Fatalf("InvalidationType(%q, %q) ok = %v, want %v", tc.method, tc.path, gotOK, tc.wantOK)
			}
			if gotType != tc.wantType {
				t.Fatalf("InvalidationType(%q, %q) type = %q, want %q", tc.method, tc.path, gotType, tc.wantType)
			}
		})
	}
}
