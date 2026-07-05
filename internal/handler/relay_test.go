package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRelayBooking_createsSlotAndInvoice(t *testing.T) {
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

	req, err := http.NewRequest(http.MethodPost, srvURL, strings.NewReader(body))
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

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if result["slotId"] != "Slot/slot-789" {
		t.Errorf("expected slotId=Slot/slot-789, got %v", result["slotId"])
	}
	if result["invoiceId"] != "Invoice/inv-012" {
		t.Errorf("expected invoiceId=Invoice/inv-012, got %v", result["invoiceId"])
	}
	if result["healthcareServiceName"] != "Konsultasi Umum" {
		t.Errorf("expected healthcareServiceName=Konsultasi Umum, got %v", result["healthcareServiceName"])
	}

	fee, ok := result["fee"].(map[string]any)
	if !ok {
		t.Fatal("expected fee object in response")
	}
	if fee["value"] != float64(150000) {
		t.Errorf("expected fee.value=150000, got %v", fee["value"])
	}
	if fee["currency"] != "IDR" {
		t.Errorf("expected fee.currency=IDR, got %v", fee["currency"])
	}
}

func TestRelayBooking_missingFields(t *testing.T) {
	srvURL := newRelayServer(t)

	tests := []struct {
		name string
		body string
	}{
		{"missing patientId", `{"practitionerRoleId":"PractitionerRole/pr-123","practitionerId":"Practitioner/prac-1","healthcareServiceId":"HealthcareService/hs-456","scheduleId":"Schedule/sched-1","organizationId":"Organization/org-1","date":"2026-07-15","startTime":"10:00","endTime":"10:30","timezone":"+07:00"}`},
		{"empty patientId", `{"patientId":"","practitionerRoleId":"PractitionerRole/pr-123","practitionerId":"Practitioner/prac-1","healthcareServiceId":"HealthcareService/hs-456","scheduleId":"Schedule/sched-1","organizationId":"Organization/org-1","date":"2026-07-15","startTime":"10:00","endTime":"10:30","timezone":"+07:00"}`},
		{"invalid patientId format", `{"patientId":"pat-1","practitionerRoleId":"PractitionerRole/pr-123","practitionerId":"Practitioner/prac-1","healthcareServiceId":"HealthcareService/hs-456","scheduleId":"Schedule/sched-1","organizationId":"Organization/org-1","date":"2026-07-15","startTime":"10:00","endTime":"10:30","timezone":"+07:00"}`},
		{"empty ID in patientId", `{"patientId":"Patient/","practitionerRoleId":"PractitionerRole/pr-123","practitionerId":"Practitioner/prac-1","healthcareServiceId":"HealthcareService/hs-456","scheduleId":"Schedule/sched-1","organizationId":"Organization/org-1","date":"2026-07-15","startTime":"10:00","endTime":"10:30","timezone":"+07:00"}`},
		{"invalid practitionerRoleId format", `{"patientId":"Patient/pat-1","practitionerRoleId":"pr-123","practitionerId":"Practitioner/prac-1","healthcareServiceId":"HealthcareService/hs-456","scheduleId":"Schedule/sched-1","organizationId":"Organization/org-1","date":"2026-07-15","startTime":"10:00","endTime":"10:30","timezone":"+07:00"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := http.Post(srvURL, "application/json", strings.NewReader(tt.body))
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", resp.StatusCode)
			}
		})
	}
}

func TestRelayBooking_backendError(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"server error"}`))
	}))
	t.Cleanup(backend.Close)

	handler := NewRelayBookingHandler(RelayBookingOptions{BackendBaseURL: backend.URL})
	srv := httptest.NewServer(handler)
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
}

func TestRelayBooking_bundleHasCorrectResources(t *testing.T) {
	var capturedBundle map[string]any

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
						"url": "https://konsulin.id/fhir/StructureDefinition/fee",
						"valueMoney": map[string]any{
							"value":    150000,
							"currency": "IDR",
						},
					},
				},
			})
			return
		}

		_ = json.NewDecoder(r.Body).Decode(&capturedBundle)
		respBundle := map[string]any{
			"resourceType": "Bundle",
			"type":         "transaction-response",
			"entry": []map[string]any{
				{"response": map[string]any{"status": "201 Created", "location": "http://localhost:8080/fhir/Slot/slot-789/_history/1"}},
				{"response": map[string]any{"status": "201 Created", "location": "http://localhost:8080/fhir/Invoice/inv-012/_history/1"}},
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

	assertBundleEntries(t, capturedBundle)
}

func TestRelayBooking_invalidMethod(t *testing.T) {
	backend := testRelayBackend()
	t.Cleanup(backend.Close)
	hdl := NewRelayBookingHandler(RelayBookingOptions{BackendBaseURL: backend.URL})
	srv := httptest.NewServer(hdl)
	t.Cleanup(srv.Close)

	resp, err := http.Get(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", resp.StatusCode)
	}
}

func TestRelayBooking_invalidJSON(t *testing.T) {
	srvURL := newRelayServer(t)

	resp, err := http.Post(srvURL, "application/json", strings.NewReader(`not json`))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

