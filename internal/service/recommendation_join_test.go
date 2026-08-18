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
