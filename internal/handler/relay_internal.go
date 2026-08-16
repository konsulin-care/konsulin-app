package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
