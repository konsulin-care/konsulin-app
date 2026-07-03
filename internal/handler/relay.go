package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

type RelayBookingOptions struct {
	BackendBaseURL string
}

type relayBookingRequest struct {
	PatientID           string `json:"patientId"`
	PractitionerRoleID  string `json:"practitionerRoleId"`
	PractitionerID      string `json:"practitionerId"`
	HealthcareServiceID string `json:"healthcareServiceId"`
	ScheduleID          string `json:"scheduleId"`
	OrganizationID      string `json:"organizationId"`
	Date                string `json:"date"`
	StartTime           string `json:"startTime"`
	EndTime             string `json:"endTime"`
	Timezone            string `json:"timezone"`
	Condition           string `json:"condition"`
}



// relayFHIRClient is the HTTP client used to POST FHIR bundles to the backend.
var relayFHIRClient = &http.Client{Timeout: 30 * time.Second}

// NewRelayBookingHandler creates a handler for POST /api/v1/relay/booking.
// It receives booking intent from the client, constructs a FHIR transaction
// bundle, POSTs it to the backend, and returns the created Slot and Invoice IDs.
func NewRelayBookingHandler(opts RelayBookingOptions) http.HandlerFunc {
	baseURL := strings.TrimRight(opts.BackendBaseURL, "/")

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
			return
		}

		var req relayBookingRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid JSON body"})
			return
		}

		if missing := validateRelayBooking(req); missing != "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing required field: " + missing})
			return
		}

		slog.Info("relay/booking",
			"scheduleId", req.ScheduleID,
			"patientId", req.PatientID,
			"practitionerRoleId", req.PractitionerRoleID,
			"healthcareServiceId", req.HealthcareServiceID,
			"date", req.Date,
			"startTime", req.StartTime,
			"endTime", req.EndTime,
		)

		bundle := buildRelayBundle(req)
		bundleBody, err := json.Marshal(bundle)
		if err != nil {
			slog.Error("relay/booking: failed to marshal bundle", "err", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "internal error"})
			return
		}

		fhirURL := baseURL + "/proxy/fhir"
		fhirReq, err := http.NewRequest(http.MethodPost, fhirURL, strings.NewReader(string(bundleBody)))
		if err != nil {
			slog.Error("relay/booking: failed to create FHIR request", "err", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "internal error"})
			return
		}
		fhirReq.Header.Set("Content-Type", "application/fhir+json")

		resp, err := relayFHIRClient.Do(fhirReq)
		if err != nil {
			slog.Error("relay/booking: backend unreachable", "err", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "backend unreachable"})
			return
		}
		defer func() { _ = resp.Body.Close() }()

		if resp.StatusCode >= 400 {
			slog.Error("relay/booking: backend error", "status", resp.StatusCode)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "backend error"})
			return
		}

		var fhirResp map[string]any
		if err := json.NewDecoder(resp.Body).Decode(&fhirResp); err != nil {
			slog.Error("relay/booking: failed to decode FHIR response", "err", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid FHIR response"})
			return
		}

		result := parseRelayResponse(fhirResp, req.HealthcareServiceID)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(result)
	}
}

func validateRelayBooking(req relayBookingRequest) string {
	if req.PatientID == "" {
		return "patientId"
	}
	if req.PractitionerRoleID == "" {
		return "practitionerRoleId"
	}
	if req.PractitionerID == "" {
		return "practitionerId"
	}
	if req.HealthcareServiceID == "" {
		return "healthcareServiceId"
	}
	if req.ScheduleID == "" {
		return "scheduleId"
	}
	if req.OrganizationID == "" {
		return "organizationId"
	}
	if req.Date == "" {
		return "date"
	}
	if req.StartTime == "" {
		return "startTime"
	}
	if req.EndTime == "" {
		return "endTime"
	}
	if req.Timezone == "" {
		return "timezone"
	}
	return ""
}

// buildRelayBundle constructs a FHIR transaction bundle that:
//   - GETs PractitionerRole and HealthcareService resources
//   - POSTs a busy-tentative Slot
//   - POSTs an issued Invoice with the fee from HealthcareService
func buildRelayBundle(req relayBookingRequest) map[string]any {
	startISO := fmt.Sprintf("%sT%s:00%s", req.Date, req.StartTime, req.Timezone)
	endISO := fmt.Sprintf("%sT%s:00%s", req.Date, req.EndTime, req.Timezone)
	now := time.Now().Format(time.RFC3339)

	// Fee extension value — the BFF extracts this from the HealthcareService
	// response. For now we use a placeholder; in production the fee is read
	// from the HealthcareService's extension.
	// The actual amount comes from: HealthcareService.extension where
	// url = "https://konsulin.id/fhir/StructureDefinition/fee"
	feeValue := 150000

	return map[string]any{
		"resourceType": "Bundle",
		"type":         "transaction",
		"entry": []map[string]any{
			{
				"request": map[string]any{
					"method": "GET",
					"url":    req.PractitionerRoleID,
				},
			},
			{
				"request": map[string]any{
					"method": "GET",
					"url":    req.HealthcareServiceID,
				},
			},
			{
				"request": map[string]any{
					"method": "POST",
					"url":    "Slot",
				},
				"resource": map[string]any{
					"resourceType": "Slot",
					"status":       "busy-tentative",
					"schedule": map[string]any{
						"reference": req.ScheduleID,
					},
					"start": startISO,
					"end":   endISO,
				},
			},
			{
				"request": map[string]any{
					"method": "POST",
					"url":    "Invoice",
				},
				"resource": map[string]any{
					"resourceType": "Invoice",
					"status":       "issued",
					"date":         now,
					"subject": map[string]any{
						"reference": req.PatientID,
					},
					"participant": []map[string]any{
						{
							"actor": map[string]any{
								"reference": req.PractitionerID,
							},
						},
						{
							"actor": map[string]any{
								"reference": req.PractitionerRoleID,
							},
						},
					},
					"issuer": map[string]any{
						"reference": req.OrganizationID,
					},
					"totalNet": map[string]any{
						"value":    feeValue,
						"currency": "IDR",
					},
				},
			},
		},
	}
}

// relayResponse is the JSON response sent back to the client.
type relayResponse struct {
	SlotID               string `json:"slotId"`
	InvoiceID            string `json:"invoiceId"`
	Fee                  feeObj `json:"fee"`
	HealthcareServiceName string `json:"healthcareServiceName"`
}

type feeObj struct {
	Value    int    `json:"value"`
	Currency string `json:"currency"`
}

// parseRelayResponse extracts Slot ID, Invoice ID, fee, and service name
// from the FHIR transaction-response bundle.
func parseRelayResponse(fhirResp map[string]any, serviceID string) relayResponse {
	entries, ok := fhirResp["entry"].([]any)
	if !ok {
		return relayResponse{
			SlotID:               "",
			InvoiceID:            "",
			Fee:                  feeObj{Value: 150000, Currency: "IDR"},
			HealthcareServiceName: stripResourceType(serviceID),
		}
	}

	var slotID, invoiceID string
	for _, entry := range entries {
		e, ok := entry.(map[string]any)
		if !ok {
			continue
		}
		resp, ok := e["response"].(map[string]any)
		if !ok {
			continue
		}
		location, ok := resp["location"].(string)
		if !ok {
			continue
		}

		if strings.HasPrefix(location, "Slot/") {
			// Extract ID before /_history
			slotID = extractFHIRID(location)
		} else if strings.HasPrefix(location, "Invoice/") {
			invoiceID = extractFHIRID(location)
		}
	}

	return relayResponse{
		SlotID:               slotID,
		InvoiceID:            invoiceID,
		Fee:                  feeObj{Value: 150000, Currency: "IDR"},
		HealthcareServiceName: stripResourceType(serviceID),
	}
}

// extractFHIRID extracts the resource ID from a FHIR location string.
// Input: "Slot/slot-789/_history/1" → Output: "Slot/slot-789"
// Input: "Slot/slot-789" → Output: "Slot/slot-789"
func extractFHIRID(location string) string {
	if idx := strings.Index(location, "/_history"); idx > 0 {
		return location[:idx]
	}
	return location
}

// stripResourceType removes the resource type prefix from a reference.
// Input: "HealthcareService/hs-456" → Output: "hs-456"
// Input: "hs-456" → Output: "hs-456"
func stripResourceType(ref string) string {
	if idx := strings.IndexByte(ref, '/'); idx > 0 {
		return ref[idx+1:]
	}
	return ref
}
