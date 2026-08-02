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

// assertBundleEntry validates a single entry's request method and URL.
func assertBundleEntry(t *testing.T, entry any, expectedMethod, expectedURL string) {
	t.Helper()
	em, ok := entry.(map[string]any)
	if !ok {
		t.Fatal("expected entry map")
		return
	}
	req, ok := em["request"].(map[string]any)
	if !ok {
		t.Fatal("expected request map")
		return
	}
	if req["method"] != expectedMethod || req["url"] != expectedURL {
		t.Errorf("expected %s %s, got %v %v", expectedMethod, expectedURL, req["method"], req["url"])
	}
}

// assertSlotResource validates the Slot entry in a transaction bundle.
func assertSlotResource(t *testing.T, entry any) {
	t.Helper()
	slotResource, ok := entry.(map[string]any)["resource"].(map[string]any)
	if !ok {
		t.Fatal("expected slot resource map")
		return
	}
	if slotResource["status"] != "free" {
		t.Errorf("expected Slot status=free, got %v", slotResource["status"])
	}
	sched, ok := slotResource["schedule"].(map[string]any)
	if !ok {
		t.Fatal("expected schedule map")
		return
	}
	if sched["reference"] != "Schedule/sched-1" {
		t.Errorf("expected Slot schedule=Schedule/sched-1")
	}
}

// assertInvoiceResource validates the Invoice entry in a transaction bundle.
func assertInvoiceResource(t *testing.T, entry any) {
	t.Helper()
	invoiceResource, ok := entry.(map[string]any)["resource"].(map[string]any)
	if !ok {
		t.Fatal("expected invoice resource map")
		return
	}
	if invoiceResource["status"] != "issued" {
		t.Errorf("expected Invoice status=issued, got %v", invoiceResource["status"])
	}
	totalNet, ok := invoiceResource["totalNet"].(map[string]any)
	if !ok {
		t.Fatal("expected totalNet map")
		return
	}
	if totalNet["value"] != float64(150000) {
		t.Errorf("expected Invoice.totalNet.value=150000, got %v", totalNet["value"])
	}
	if totalNet["currency"] != "IDR" {
		t.Errorf("expected Invoice.totalNet.currency=IDR, got %v", totalNet["currency"])
	}
	subject, ok := invoiceResource["subject"].(map[string]any)
	if !ok {
		t.Fatal("expected subject map")
		return
	}
	if subject["reference"] != "Patient/pat-1" {
		t.Errorf("expected Invoice subject=Patient/pat-1")
	}
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

	assertBundleEntry(t, entries[0], "POST", "Slot")
	assertBundleEntry(t, entries[1], "POST", "Invoice")
	assertSlotResource(t, entries[0])
	assertInvoiceResource(t, entries[1])
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
