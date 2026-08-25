package service

import (
	"testing"
)

func TestJoinPractitionerPhotoFromFHIR(t *testing.T) {
	// Case 1: Practitioner has a photo
	bundle1 := &searchset{
		Entry: []searchEntry{
			{Resource: []byte(`{
				"resourceType": "PractitionerRole",
				"id": "role-1",
				"practitioner": {"reference": "Practitioner/pr-1"},
				"location": [{"reference": "Location/loc-1"}],
				"healthcareService": [{"reference": "HealthcareService/hs-1"}],
				"specialty": [{"coding": [{"code": "gp", "display": "General Practice"}]}]
			}`)},
			{Resource: []byte(`{
				"resourceType": "Practitioner",
				"id": "pr-1",
				"name": [{"given": ["Budi"], "family": "Santoso"}],
				"photo": [{"url": "https://storage.example.com/photos/budi.jpg"}]
			}`)},
			{Resource: []byte(`{
				"resourceType": "HealthcareService",
				"id": "hs-1",
				"name": "General Consultation",
				"type": [{"coding": [{"code": "gp"}]}],
				"extension": [{"url": "http://konsulin.care/fhir/StructureDefinition/fee", "valueMoney": {"value": 150000, "currency": "IDR"}}]
			}`)},
			{Resource: []byte(`{
				"resourceType": "Location",
				"id": "loc-1",
				"name": "Klinik Sehat"
			}`)},
		},
	}

	logical1, err := parseRoleBundle(bundle1)
	if err != nil {
		t.Fatalf("parseRoleBundle: %v", err)
	}
	recs1 := buildCandidates(logical1, nil, false)
	if len(recs1) == 0 {
		t.Fatal("expected at least one recommendation")
	}
	if recs1[0].PractitionerPhoto != "https://storage.example.com/photos/budi.jpg" {
		t.Errorf("expected photo URL, got %q", recs1[0].PractitionerPhoto)
	}

	// Case 2: Practitioner has no photo
	bundle2 := &searchset{
		Entry: []searchEntry{
			{Resource: []byte(`{
				"resourceType": "PractitionerRole",
				"id": "role-2",
				"practitioner": {"reference": "Practitioner/pr-2"},
				"location": [{"reference": "Location/loc-2"}],
				"healthcareService": [{"reference": "HealthcareService/hs-2"}],
				"specialty": [{"coding": [{"code": "dentist", "display": "Dentist"}]}]
			}`)},
			{Resource: []byte(`{
				"resourceType": "Practitioner",
				"id": "pr-2",
				"name": [{"given": ["Siti"], "family": "Aminah"}]
			}`)},
			{Resource: []byte(`{
				"resourceType": "HealthcareService",
				"id": "hs-2",
				"name": "Dental Checkup",
				"type": [{"coding": [{"code": "dentist"}]}],
				"extension": [{"url": "http://konsulin.care/fhir/StructureDefinition/fee", "valueMoney": {"value": 200000, "currency": "IDR"}}]
			}`)},
			{Resource: []byte(`{
				"resourceType": "Location",
				"id": "loc-2",
				"name": "Klinik Gigi"
			}`)},
		},
	}

	logical2, err := parseRoleBundle(bundle2)
	if err != nil {
		t.Fatalf("parseRoleBundle: %v", err)
	}
	recs2 := buildCandidates(logical2, nil, false)
	if len(recs2) == 0 {
		t.Fatal("expected at least one recommendation")
	}
	if recs2[0].PractitionerPhoto != "" {
		t.Errorf("expected empty photo, got %q", recs2[0].PractitionerPhoto)
	}
}

// TestBuildCandidates_bareIDs verifies that recommendation IDs do not include
// FHIR resource type prefixes (e.g., "role-1" not "PractitionerRole/role-1").
func TestBuildCandidates_bareIDs(t *testing.T) {
	bundle := &searchset{
		Entry: []searchEntry{
			{Resource: []byte(`{
				"resourceType": "PractitionerRole",
				"id": "role-01-01",
				"practitioner": {"reference": "Practitioner/prc-01"},
				"location": [{"reference": "Location/loc-01"}],
				"healthcareService": [{"reference": "HealthcareService/hs-01-01"}],
				"specialty": [{"coding": [{"code": "psychology"}]}],
				"availableTime": [{"daysOfWeek": ["mon"], "availableStartTime": "09:00", "availableEndTime": "17:00"}]
			}`)},
			{Resource: []byte(`{
				"resourceType": "Practitioner",
				"id": "prc-01",
				"name": [{"given": ["Budi"]}]
			}`)},
			{Resource: []byte(`{
				"resourceType": "HealthcareService",
				"id": "hs-01-01",
				"name": "Consultation",
				"type": [{"coding": [{"code": "psychology"}]}],
				"extension": [{"url": "http://konsulin.care/fhir/StructureDefinition/fee", "valueMoney": {"value": 100000, "currency": "IDR"}}]
			}`)},
			{Resource: []byte(`{
				"resourceType": "Location",
				"id": "loc-01",
				"name": "Klinik Utama"
			}`)},
			{Resource: []byte(`{
				"resourceType": "Schedule",
				"id": "sch-01-01",
				"actor": [{"reference": "PractitionerRole/role-01-01"}]
			}`)},
		},
	}

	logi, err := parseRoleBundle(bundle)
	if err != nil {
		t.Fatalf("parseRoleBundle: %v", err)
	}
	recs := buildCandidates(logi, nil, false)
	if len(recs) == 0 {
		t.Fatal("expected at least one recommendation")
	}

	r := recs[0]
	assertBare(t, "PractitionerRoleID", r.PractitionerRoleID, "role-01-01")
	assertBare(t, "PractitionerID", r.PractitionerID, "prc-01")
	assertBare(t, "HealthcareServiceID", r.HealthcareServiceID, "hs-01-01")
	assertBare(t, "LocationID", r.LocationID, "loc-01")
	assertBare(t, "ScheduleID", r.ScheduleID, "sch-01-01")
}

func assertBare(t *testing.T, field, got, want string) {
	t.Helper()
	if got != want {
		t.Errorf("%s: got %q, want %q (should be bare, no resource prefix)", field, got, want)
	}
}

// TestDedupByPractitionerPrefersIntentMatch pins that per-practitioner dedup
// keeps the service whose type matches the requested serviceTypeCode even
// when a non-matching service is cheaper. Fee is the tiebreaker only when no
// service matches the intent; the NUCC specialty code remains a fallback so
// legacy callers without serviceTypeCode keep their behavior.
func TestDedupByPractitionerPrefersIntentMatch(t *testing.T) {
	// Intent match beats a cheaper non-matching service.
	intent := []Recommendation{
		{PractitionerID: "prc-1", PractitionerRoleID: "role-1", Fee: 350000, serviceTypeCodes: []string{"medication-management"}},
		{PractitionerID: "prc-1", PractitionerRoleID: "role-1", Fee: 400000, serviceTypeCodes: []string{"burnout-care"}},
	}
	got := dedupByPractitioner(intent, "2084P0800X", "burnout-care")
	if len(got) != 1 {
		t.Fatalf("expected 1 candidate per practitioner, got %d", len(got))
	}
	if got[0].Fee != 400000 {
		t.Errorf("expected intent-matching service (fee 400000), got fee %d", got[0].Fee)
	}

	// No service matches the intent → cheapest wins (fee tiebreak).
	noMatch := []Recommendation{
		{PractitionerID: "prc-2", PractitionerRoleID: "role-2", Fee: 350000, serviceTypeCodes: []string{"medication-management"}},
		{PractitionerID: "prc-2", PractitionerRoleID: "role-2", Fee: 400000, serviceTypeCodes: []string{"medication-management"}},
	}
	gotNo := dedupByPractitioner(noMatch, "2084P0800X", "burnout-care")
	if len(gotNo) != 1 || gotNo[0].Fee != 350000 {
		t.Errorf("expected cheapest when no intent match, got %+v", gotNo)
	}

	// NUCC fallback preserves legacy matching when serviceTypeCode is empty.
	nucc := []Recommendation{
		{PractitionerID: "prc-3", PractitionerRoleID: "role-3", Fee: 350000, serviceTypeCodes: []string{"2084P0800X"}},
		{PractitionerID: "prc-3", PractitionerRoleID: "role-3", Fee: 400000, serviceTypeCodes: []string{"burnout-care"}},
	}
	gotNucc := dedupByPractitioner(nucc, "2084P0800X", "")
	if len(gotNucc) != 1 || gotNucc[0].Fee != 350000 {
		t.Errorf("expected NUCC-typed service (fee 350000) to win, got %+v", gotNucc)
	}
}
