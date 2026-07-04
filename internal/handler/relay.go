package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
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

		// Fetch HealthcareService to get the authoritative fee.
		authToken := ""
		if c, err := r.Cookie("sAccessToken"); err == nil && c.Value != "" {
			authToken = "Bearer " + c.Value
		}

		fee, err := fetchHealthcareServiceFee(baseURL, req.HealthcareServiceID, authToken)
		if err != nil {
			slog.Error("relay/booking: failed to fetch HealthcareService fee", "err", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to fetch service fee"})
			return
		}

		bundle := buildRelayBundle(req, fee)
		bundleBody, err := json.Marshal(bundle)
		if err != nil {
			slog.Error("relay/booking: failed to marshal bundle", "err", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "internal error"})
			return
		}

		fhirURL := baseURL + "/fhir"
		fhirReq, err := http.NewRequest(http.MethodPost, fhirURL, strings.NewReader(string(bundleBody)))
		if err != nil {
			slog.Error("relay/booking: failed to create FHIR request", "err", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "internal error"})
			return
		}
		fhirReq.Header.Set("Content-Type", "application/fhir+json")

		// Forward auth token from client session — same as backend proxy.
		if authToken != "" {
			fhirReq.Header.Set("Authorization", authToken)
		}

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

		result := parseRelayResponse(fhirResp, req.HealthcareServiceID, fee)
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
//   - POSTs a busy-tentative Slot
//   - POSTs an issued Invoice with the given fee
func buildRelayBundle(req relayBookingRequest, fee feeObj) map[string]any {
	startISO := fmt.Sprintf("%sT%s:00%s", req.Date, req.StartTime, req.Timezone)
	endISO := fmt.Sprintf("%sT%s:00%s", req.Date, req.EndTime, req.Timezone)
	now := time.Now().Format(time.RFC3339)

	// Use the fee fetched from HealthcareService.
	return map[string]any{
		"resourceType": "Bundle",
		"type":         "transaction",
		"entry": []map[string]any{
			{
				"request": map[string]any{
					"method": "POST",
					"url":    "Slot",
				},
				"resource": map[string]any{
					"resourceType": "Slot",
					"status":       "free",
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
						"value":    fee.Value,
						"currency": fee.Currency,
					},
				},
			},
		},
	}
}

// constFeeExtensionURL is the FHIR extension URL for service fee.
const constFeeExtensionURL = "https://konsulin.id/fhir/StructureDefinition/fee"

// fetchHealthcareServiceFee fetches the HealthcareService resource and extracts
// the fee from its extension.
func fetchHealthcareServiceFee(baseURL, healthcareServiceID, authToken string) (feeObj, error) {
	hsURL := baseURL + "/fhir/" + healthcareServiceID
	req, err := http.NewRequest(http.MethodGet, hsURL, http.NoBody)
	if err != nil {
		return feeObj{}, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/fhir+json")
	if authToken != "" {
		req.Header.Set("Authorization", authToken)
	}

	resp, err := relayFHIRClient.Do(req)
	if err != nil {
		return feeObj{}, fmt.Errorf("get HealthcareService: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 400 {
		return feeObj{}, fmt.Errorf("HealthcareService returned status %d", resp.StatusCode)
	}

	var hs map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&hs); err != nil {
		return feeObj{}, fmt.Errorf("decode HealthcareService: %w", err)
	}

	extensions, ok := hs["extension"].([]any)
	if !ok {
		return feeObj{}, fmt.Errorf("no extension on HealthcareService")
	}

	for _, ext := range extensions {
		e, ok := ext.(map[string]any)
		if !ok {
			continue
		}
		if e["url"] != constFeeExtensionURL {
			continue
		}
		valueMoney, ok := e["valueMoney"].(map[string]any)
		if !ok {
			continue
		}

		value, _ := valueMoney["value"].(float64)
		currency, _ := valueMoney["currency"].(string)
		if currency == "" {
			currency = "IDR"
		}
		return feeObj{Value: int(value), Currency: currency}, nil
	}

	return feeObj{}, fmt.Errorf("fee extension not found on HealthcareService")
}

// relayResponse is the JSON response sent back to the client.
type relayResponse struct {
	SlotID                string `json:"slotId"`
	InvoiceID             string `json:"invoiceId"`
	Fee                   feeObj `json:"fee"`
	HealthcareServiceName string `json:"healthcareServiceName"`
}

type feeObj struct {
	Value    int    `json:"value"`
	Currency string `json:"currency"`
}

// parseRelayResponse extracts Slot ID, Invoice ID from the FHIR transaction-response
// bundle and returns the response with the pre-fetched fee.
func parseRelayResponse(fhirResp map[string]any, serviceID string, fee feeObj) relayResponse {
	entries, ok := fhirResp["entry"].([]any)
	if !ok {
		return relayResponse{
			SlotID:                "",
			InvoiceID:             "",
			Fee:                   fee,
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

		localized := normalizeLocation(location)
		if strings.HasPrefix(localized, "Slot/") {
			slotID = extractFHIRID(localized)
		} else if strings.HasPrefix(localized, "Invoice/") {
			invoiceID = extractFHIRID(localized)
		}
	}

	return relayResponse{
		SlotID:                slotID,
		InvoiceID:             invoiceID,
		Fee:                   fee,
		HealthcareServiceName: stripResourceType(serviceID),
	}
}

// normalizeLocation converts a FHIR location to a relative resource path.
// Input: "http://localhost:8080/fhir/Slot/slot-789/_history/1"
// Output: "Slot/slot-789/_history/1"
// Relative paths are returned unchanged.
func normalizeLocation(location string) string {
	if !strings.HasPrefix(location, "http://") && !strings.HasPrefix(location, "https://") {
		return location
	}

	u, err := url.Parse(location)
	if err != nil {
		return location
	}

	// Find the resource type segment (Slot, Invoice, etc.) in the path
	path := strings.TrimPrefix(u.Path, "/")
	for _, prefix := range []string{"fhir/"} {
		path = strings.TrimPrefix(path, prefix)
	}
	return path
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
