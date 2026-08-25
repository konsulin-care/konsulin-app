package handler

import (
	"net/url"
	"strings"
	"time"
)

// participantNeedsAction is the FHIR Appointment participant status for pending participants.
const participantNeedsAction = "needs-action"

// parseRelayResponse extracts Slot ID, Invoice ID, and Appointment ID from the
// FHIR transaction-response bundle.
func parseRelayResponse(fhirResp map[string]any, fee feeObj) relayResponse {
	entries, ok := fhirResp["entry"].([]any)
	if !ok {
		return relayResponse{
			SlotID:                "",
			InvoiceID:             "",
			AppointmentID:         "",
			Fee:                   fee,
			HealthcareServiceName: fee.ServiceName,
		}
	}

	var slotID, invoiceID, appointmentID string
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
		} else if strings.HasPrefix(localized, "Appointment/") {
			appointmentID = extractFHIRID(localized)
		}
	}

	return relayResponse{
		SlotID:                slotID,
		InvoiceID:             invoiceID,
		AppointmentID:         appointmentID,
		Fee:                   fee,
		HealthcareServiceName: fee.ServiceName,
	}
}

// buildRelayBundle constructs a FHIR transaction bundle that:
//   - POSTs a free Slot (referenced via urn:uuid by the Appointment)
//   - POSTs an issued Invoice with the given fee
//   - POSTs a proposed Appointment referencing the Slot via urn:uuid
func buildRelayBundle(req relayBookingRequest, fee feeObj) map[string]any {
	startISO := isoDateTime(req.Date, req.StartTime, req.Timezone)
	endISO := isoDateTime(req.Date, req.EndTime, req.Timezone)
	now := timeNow()

	return map[string]any{
		"resourceType": "Bundle",
		"type":         "transaction",
		"entry": []map[string]any{
			{
				"fullUrl": "urn:uuid:slot-1",
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
			{
				"request": map[string]any{
					"method": "POST",
					"url":    "Appointment",
				},
				"resource": map[string]any{
					"resourceType": "Appointment",
					"status":       "proposed",
					"start":        startISO,
					"end":          endISO,
					"created":      now,
					"slot": []map[string]any{
						{
							"reference": "urn:uuid:slot-1",
						},
					},
					"participant": []map[string]any{
						{
							"actor": map[string]any{
								"reference": req.PatientID,
							},
							"status": participantNeedsAction,
						},
						{
							"actor": map[string]any{
								"reference": req.PractitionerID,
							},
							"status": participantNeedsAction,
						},
						{
							"actor": map[string]any{
								"reference": req.PractitionerRoleID,
							},
							"status": participantNeedsAction,
						},
						{
							"actor": map[string]any{
								"reference": req.HealthcareServiceID,
							},
							"status": participantNeedsAction,
						},
					},
				},
			},
		},
	}
}

// isoDateTime formats date + HH:mm time + timezone offset as an ISO instant.
func isoDateTime(date, time, tz string) string {
	return date + "T" + time + ":00" + tz
}

// timeNow returns the current UTC time in RFC3339 format.
func timeNow() string {
	return time.Now().Format(time.RFC3339)
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
