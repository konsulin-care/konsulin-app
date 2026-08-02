package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// relayFHIRClient is the HTTP client used to POST FHIR bundles to the backend.
var relayFHIRClient = &http.Client{Timeout: 30 * time.Second}

// constFeeExtensionURL is the FHIR extension URL for service fee.
const constFeeExtensionURL = "http://konsulin.care/fhir/StructureDefinition/fee"

// validateFHIRReference checks that ref has the form "expectedType/non-empty-id".
func validateFHIRReference(ref, expectedType string) bool {
	prefix := expectedType + "/"
	if !strings.HasPrefix(ref, prefix) {
		return false
	}
	return strings.TrimPrefix(ref, prefix) != ""
}

// validateRelayBooking checks all required fields on the request.
func validateRelayBooking(req relayBookingRequest) string {
	if !validateFHIRReference(req.PatientID, "Patient") {
		return "patientId"
	}
	if !validateFHIRReference(req.PractitionerRoleID, "PractitionerRole") {
		return "practitionerRoleId"
	}
	if !validateFHIRReference(req.PractitionerID, "Practitioner") {
		return "practitionerId"
	}
	if !validateFHIRReference(req.HealthcareServiceID, "HealthcareService") {
		return "healthcareServiceId"
	}
	if !validateFHIRReference(req.ScheduleID, "Schedule") {
		return "scheduleId"
	}
	if !validateFHIRReference(req.OrganizationID, "Organization") {
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
//   - POSTs a free Slot (backend transitions to busy-tentative after payment)
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
		name, _ := hs["name"].(string)
		return feeObj{Value: int(value), Currency: currency, ServiceName: name}, nil
	}

	return feeObj{}, fmt.Errorf("fee extension not found on HealthcareService")
}

// postFHIRBundle POSTs the bundle body to the backend /fhir endpoint.
func postFHIRBundle(baseURL string, bundleBody []byte, authToken string) (map[string]any, error) {
	fhirURL := baseURL + "/fhir"
	fhirReq, err := http.NewRequest(http.MethodPost, fhirURL, strings.NewReader(string(bundleBody)))
	if err != nil {
		return nil, fmt.Errorf("create FHIR request: %w", err)
	}
	fhirReq.Header.Set(headerContentType, "application/fhir+json")
	if authToken != "" {
		fhirReq.Header.Set("Authorization", authToken)
	}

	resp, err := relayFHIRClient.Do(fhirReq)
	if err != nil {
		return nil, &upstreamError{StatusCode: http.StatusBadGateway, Message: "backend unreachable"}
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, &upstreamError{StatusCode: resp.StatusCode, Message: string(body)}
	}

	var fhirResp map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&fhirResp); err != nil {
		return nil, fmt.Errorf("invalid FHIR response")
	}
	return fhirResp, nil
}

// parseRelayResponse extracts Slot ID and Invoice ID from the FHIR
// transaction-response bundle.
func parseRelayResponse(fhirResp map[string]any, serviceID string, fee feeObj) relayResponse {
	entries, ok := fhirResp["entry"].([]any)
	if !ok {
		return relayResponse{
			SlotID:                "",
			InvoiceID:             "",
			Fee:                   fee,
			HealthcareServiceName: fee.ServiceName,
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
		HealthcareServiceName: fee.ServiceName,
	}
}

// normalizeLocation converts a FHIR location to a relative resource path.
// Input: "http://localhost:8080/fhir/Slot/slot-789/_history/1"
// Output: "Slot/slot-789/_history/1"
func normalizeLocation(location string) string {
	if !strings.HasPrefix(location, "http://") && !strings.HasPrefix(location, "https://") {
		return location
	}
	u, err := url.Parse(location)
	if err != nil {
		return location
	}
	path := strings.TrimPrefix(u.Path, "/")
	for _, prefix := range []string{"fhir/"} {
		path = strings.TrimPrefix(path, prefix)
	}
	return path
}

// extractFHIRID strips the _history segment from a FHIR location.
// Input: "Slot/slot-789/_history/1" → Output: "Slot/slot-789"
func extractFHIRID(location string) string {
	if idx := strings.Index(location, "/_history"); idx > 0 {
		return location[:idx]
	}
	return location
}
