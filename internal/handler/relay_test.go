package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// testRelayBackend returns a test FHIR server that serves HealthcareService
// and handles transaction bundles.
func testRelayBackend() *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Handle HealthcareService GET
		if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/fhir/HealthcareService/") {
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resourceType": "HealthcareService",
				"id":           "hs-456",
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

		if r.URL.Path == "/fhir" && r.Method == http.MethodPost {
			var bundle map[string]any
			if err := json.NewDecoder(r.Body).Decode(&bundle); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_, _ = w.Write([]byte(`{"error":"invalid bundle"}`))
				return
			}

			if bundle["resourceType"] != "Bundle" || bundle["type"] != "transaction" {
				w.WriteHeader(http.StatusBadRequest)
				_, _ = w.Write([]byte(`{"error":"expected transaction bundle"}`))
				return
			}

			respBundle := map[string]any{
				"resourceType": "Bundle",
				"type":         "transaction-response",
				"entry": []map[string]any{
					{
						"response": map[string]any{
							"status":   "200 OK",
							"location": "http://localhost:8080/fhir/PractitionerRole/pr-123/_history/1",
						},
					},
					{
						"response": map[string]any{
							"status":   "200 OK",
							"location": "http://localhost:8080/fhir/HealthcareService/hs-456/_history/1",
						},
					},
					{
						"response": map[string]any{
							"status":   "201 Created",
							"location": "http://localhost:8080/fhir/Slot/slot-789/_history/1",
						},
					},
					{
						"response": map[string]any{
							"status":   "201 Created",
							"location": "http://localhost:8080/fhir/Invoice/inv-012/_history/1",
						},
					},
				},
			}
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(respBundle)
			return
		}

		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
	}))
}

func newRelayServer(t *testing.T) string {
	t.Helper()
	backend := testRelayBackend()
	t.Cleanup(backend.Close)
	handler := NewRelayBookingHandler(RelayBookingOptions{BackendBaseURL: backend.URL})
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	return srv.URL
}

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

	resp, err := http.Post(srvURL, "application/json", strings.NewReader(body))
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
	if result["healthcareServiceName"] != "hs-456" {
		t.Errorf("expected healthcareServiceName=hs-456 (fallback ID), got %v", result["healthcareServiceName"])
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
		{"missing patientId", `{"practitionerRoleId":"pr-123","date":"2026-07-15","startTime":"10:00","endTime":"10:30"}`},
		{"empty patientId", `{"patientId":"","practitionerRoleId":"pr-123","date":"2026-07-15","startTime":"10:00","endTime":"10:30"}`},
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

	resp, err := http.Post(srv.URL, "application/json", strings.NewReader(body))
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
		// Handle HealthcareService GET
		if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/fhir/HealthcareService/") {
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resourceType": "HealthcareService",
				"id":           "hs-456",
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

	_, err := http.Post(srv.URL, "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}

	if capturedBundle["resourceType"] != "Bundle" {
		t.Errorf("expected Bundle, got %v", capturedBundle["resourceType"])
	}
	if capturedBundle["type"] != "transaction" {
		t.Errorf("expected transaction, got %v", capturedBundle["type"])
	}

	entries, ok := capturedBundle["entry"].([]any)
	if !ok {
		t.Fatal("expected entry array")
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}

	entry0 := entries[0].(map[string]any)
	req0 := entry0["request"].(map[string]any)
	if req0["method"] != "POST" || req0["url"] != "Slot" {
		t.Errorf("entry 0: expected POST Slot, got %v %v", req0["method"], req0["url"])
	}

	entry1 := entries[1].(map[string]any)
	req1 := entry1["request"].(map[string]any)
	if req1["method"] != "POST" || req1["url"] != "Invoice" {
		t.Errorf("entry 1: expected POST Invoice, got %v %v", req1["method"], req1["url"])
	}

	slotResource := entry0["resource"].(map[string]any)
	if slotResource["status"] != "busy-tentative" {
		t.Errorf("expected Slot status=busy-tentative, got %v", slotResource["status"])
	}
	if slotResource["schedule"].(map[string]any)["reference"] != "Schedule/sched-1" {
		t.Errorf("expected Slot schedule=Schedule/sched-1")
	}

	invoiceResource := entry1["resource"].(map[string]any)
	if invoiceResource["status"] != "issued" {
		t.Errorf("expected Invoice status=issued, got %v", invoiceResource["status"])
	}
	totalNet := invoiceResource["totalNet"].(map[string]any)
	if totalNet == nil {
		t.Error("expected Invoice.totalNet")
	}
	if totalNet["value"] != float64(150000) {
		t.Errorf("expected Invoice.totalNet.value=150000, got %v", totalNet["value"])
	}
	if totalNet["currency"] != "IDR" {
		t.Errorf("expected Invoice.totalNet.currency=IDR, got %v", totalNet["currency"])
	}
	if invoiceResource["subject"].(map[string]any)["reference"] != "Patient/pat-1" {
		t.Errorf("expected Invoice subject=Patient/pat-1")
	}
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

func TestRelayBooking_forwardsAuthToken(t *testing.T) {
	var capturedAuth string

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = r.Header.Get("Authorization")

		// Handle HealthcareService GET
		if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/fhir/HealthcareService/") {
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resourceType": "HealthcareService",
				"id":           "hs-456",
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
	req.AddCookie(&http.Cookie{Name: "sAccessToken", Value: "test-access-token-123"})

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
	expected := "Bearer test-access-token-123"
	if capturedAuth != expected {
		t.Errorf("expected Authorization header %q, got %q", expected, capturedAuth)
	}
}

func TestRelayBooking_skipsAuthWhenNoCookie(t *testing.T) {
	var capturedAuth string

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = r.Header.Get("Authorization")

		// Handle HealthcareService GET
		if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/fhir/HealthcareService/") {
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resourceType": "HealthcareService",
				"id":           "hs-456",
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

	// No cookie set
	resp, err := http.Post(srv.URL, "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	if capturedAuth != "" {
		t.Errorf("expected no Authorization header when no cookie, got %q", capturedAuth)
	}
}
