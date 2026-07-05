package handler

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// testAccessToken creates a valid-format sAccessToken JWT for testing.
// VerifySession decodes the base64 payload without signature verification.
func testAccessToken(sub string) string {
	h := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"none"}`))
	p := base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf(`{"sub":"%s"}`, sub)))
	return h + "." + p + ".test-sig"
}

// testRelayBackend returns a test FHIR server that serves HealthcareService
// and handles transaction bundles.
func testRelayBackend() *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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

// assertBundleEntries validates the FHIR transaction bundle structure and values.
func assertBundleEntries(t *testing.T, capturedBundle map[string]any) {
	t.Helper()

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
	if slotResource["status"] != "free" {
		t.Errorf("expected Slot status=free, got %v", slotResource["status"])
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

// newRelayServer creates a test server with the relay handler backed by testRelayBackend.
func newRelayServer(t *testing.T) string {
	t.Helper()
	backend := testRelayBackend()
	t.Cleanup(backend.Close)
	handler := NewRelayBookingHandler(RelayBookingOptions{BackendBaseURL: backend.URL})
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	return srv.URL
}
