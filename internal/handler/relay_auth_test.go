package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRelayBooking_forwardsAuthToken(t *testing.T) {
	var capturedAuth string

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = r.Header.Get("Authorization")

		if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/fhir/HealthcareService/") {
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resourceType": "HealthcareService",
				"id":           "hs-456",
				"name":         "Konsultasi Umum",
				"extension": []map[string]any{
					{
						"url": "http://konsulin.care/fhir/StructureDefinition/fee",
						"valueMoney": map[string]any{
							"value":    150000,
							"currency": "IDR",
						},
					},
				},
			})
			return
		}

		respBundle := map[string]any{
			"resourceType": "Bundle",
			"type":         "transaction-response",
			"entry": []map[string]any{
				{"response": map[string]any{"status": "200 OK", "location": "http://localhost:8080/fhir/Slot/slot-789/_history/1"}},
				{"response": map[string]any{"status": "200 OK", "location": "http://localhost:8080/fhir/Invoice/inv-012/_history/1"}},
			},
		}
		w.Header().Set("Content-Type", "application/fhir+json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(respBundle)
	}))
	t.Cleanup(backend.Close)

	hdl := NewRelayBookingHandler(RelayBookingOptions{BackendBaseURL: backend.URL})
	srv := httptest.NewServer(hdl)
	t.Cleanup(srv.Close)

	body := `{
		"patientId": "Patient/pat-1",
		"practitionerRoleId": "PractitionerRole/pr-123",
		"practitionerId": "Practitioner/prac-1",
		"healthcareServiceId": "HealthcareService/hs-456",
		"scheduleId": "Schedule/sched-1",
		"organizationId": "Organization/org-1",
		"date": "2026-07-15",
		"startTime": "10:00",
		"endTime": "10:30",
		"timezone": "+07:00",
		"condition": "anxiety"
	}`

	req, err := http.NewRequest(http.MethodPost, srv.URL, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: "sAccessToken", Value: testAccessToken("user-1")})

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	if capturedAuth == "" {
		t.Fatal("expected Authorization header to be forwarded to backend, got empty")
	}
	expected := "Bearer " + testAccessToken("user-1")
	if capturedAuth != expected {
		t.Errorf("expected Authorization header %q, got %q", expected, capturedAuth)
	}
}

func TestRelayBooking_passthroughUpstreamStatus(t *testing.T) {
	var bundlePosted bool
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/fhir/HealthcareService/") {
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resourceType": "HealthcareService",
				"id":           "hs-456",
				"name":         "Konsultasi Umum",
				"extension": []map[string]any{
					{
						"url": "http://konsulin.care/fhir/StructureDefinition/fee",
						"valueMoney": map[string]any{
							"value":    150000,
							"currency": "IDR",
						},
					},
				},
			})
			return
		}
		bundlePosted = true
		w.WriteHeader(http.StatusConflict)
		_, _ = w.Write([]byte(`{"error":"slot already exists"}`))
	}))
	t.Cleanup(backend.Close)

	hdl := NewRelayBookingHandler(RelayBookingOptions{BackendBaseURL: backend.URL})
	srv := httptest.NewServer(hdl)
	t.Cleanup(srv.Close)

	body := `{
		"patientId": "Patient/pat-1",
		"practitionerRoleId": "PractitionerRole/pr-123",
		"practitionerId": "Practitioner/prac-1",
		"healthcareServiceId": "HealthcareService/hs-456",
		"scheduleId": "Schedule/sched-1",
		"organizationId": "Organization/org-1",
		"date": "2026-07-15",
		"startTime": "10:00",
		"endTime": "10:30",
		"timezone": "+07:00",
		"condition": "anxiety"
	}`

	req, err := http.NewRequest(http.MethodPost, srv.URL, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: "sAccessToken", Value: testAccessToken("user-1")})
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusConflict {
		t.Errorf("expected 409 Conflict, got %d", resp.StatusCode)
	}
	if !bundlePosted {
		t.Error("expected bundle POST to be attempted")
	}
}

func TestRelayBooking_rejectsEmptyBackendResponse(t *testing.T) {
	var bundlePosted bool
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/fhir/HealthcareService/") {
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resourceType": "HealthcareService",
				"id":           "hs-456",
				"name":         "Konsultasi Umum",
				"extension": []map[string]any{
					{
						"url": "http://konsulin.care/fhir/StructureDefinition/fee",
						"valueMoney": map[string]any{
							"value":    150000,
							"currency": "IDR",
						},
					},
				},
			})
			return
		}
		bundlePosted = true
		w.Header().Set("Content-Type", "application/fhir+json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"resourceType": "Bundle",
			"type":         "transaction-response",
			"entry":        []map[string]any{},
		})
	}))
	t.Cleanup(backend.Close)

	hdl := NewRelayBookingHandler(RelayBookingOptions{BackendBaseURL: backend.URL})
	srv := httptest.NewServer(hdl)
	t.Cleanup(srv.Close)

	body := `{
		"patientId": "Patient/pat-1",
		"practitionerRoleId": "PractitionerRole/pr-123",
		"practitionerId": "Practitioner/prac-1",
		"healthcareServiceId": "HealthcareService/hs-456",
		"scheduleId": "Schedule/sched-1",
		"organizationId": "Organization/org-1",
		"date": "2026-07-15",
		"startTime": "10:00",
		"endTime": "10:30",
		"timezone": "+07:00",
		"condition": "anxiety"
	}`

	req, err := http.NewRequest(http.MethodPost, srv.URL, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: "sAccessToken", Value: testAccessToken("user-1")})
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadGateway {
		t.Errorf("expected 502, got %d", resp.StatusCode)
	}
	if !bundlePosted {
		t.Error("expected bundle POST to be attempted")
	}
}

func TestRelayBooking_skipsAuthWhenNoCookie(t *testing.T) {
	srvURL := newRelayServer(t)

	body := `{
		"patientId": "Patient/pat-1",
		"practitionerRoleId": "PractitionerRole/pr-123",
		"practitionerId": "Practitioner/prac-1",
		"healthcareServiceId": "HealthcareService/hs-456",
		"scheduleId": "Schedule/sched-1",
		"organizationId": "Organization/org-1",
		"date": "2026-07-15",
		"startTime": "10:00",
		"endTime": "10:30",
		"timezone": "+07:00",
		"condition": "anxiety"
	}`

	// No cookie set — expect 401.
	resp, err := http.Post(srvURL, "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}
