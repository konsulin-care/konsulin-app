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

const statusCreated = "201 Created"

// testAccessToken creates a valid-format sAccessToken JWT for testing.
// VerifySession decodes the base64 payload without signature verification.
func testAccessToken(sub string) string {
	h := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"none"}`))
	p := base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf(`{"sub":%q}`, sub)))
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
						"url": constFeeExtensionURL,
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
							"status":   statusCreated,
							"location": "http://localhost:8080/fhir/Slot/slot-789/_history/1",
						},
					},
					{
						"response": map[string]any{
							"status":   statusCreated,
							"location": "http://localhost:8080/fhir/Invoice/inv-012/_history/1",
						},
					},
					{
						"response": map[string]any{
							"status":   statusCreated,
							"location": "http://localhost:8080/fhir/Appointment/appt-345/_history/1",
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
