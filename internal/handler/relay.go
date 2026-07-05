package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/konsulin-care/konsulin-app/internal/client"
)

// RelayBookingOptions configures the relay booking handler.
type RelayBookingOptions struct {
	BackendBaseURL string
}

// relayBookingRequest is the JSON body from the client.
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

// relayResponse is the JSON response sent back to the client.
type relayResponse struct {
	SlotID               string `json:"slotId"`
	InvoiceID            string `json:"invoiceId"`
	Fee                  feeObj `json:"fee"`
	HealthcareServiceName string `json:"healthcareServiceName"`
}

// feeObj holds the monetary fee fetched from HealthcareService.
type feeObj struct {
	Value       int    `json:"value"`
	Currency    string `json:"currency"`
	ServiceName string `json:"-"` // populated from HealthcareService.name
}

// upstreamError carries the HTTP status code from the upstream backend.
type upstreamError struct {
	StatusCode int
	Message    string
}

func (e *upstreamError) Error() string { return e.Message }

// Duplicated literal constants to satisfy SonarQube maintainability rules.
const (
	contentTypeJSON     = "application/json"
	headerContentType   = "Content-Type"
)

// NewRelayBookingHandler creates a handler for POST /api/v1/relay/booking.
// It receives booking intent from the client, constructs a FHIR transaction
// bundle, POSTs it to the backend, and returns the created Slot and Invoice IDs.
func NewRelayBookingHandler(opts RelayBookingOptions) http.HandlerFunc {
	baseURL := strings.TrimRight(opts.BackendBaseURL, "/")

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			sendError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req relayBookingRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		if missing := validateRelayBooking(req); missing != "" {
			sendError(w, http.StatusBadRequest, "missing required field: "+missing)
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

		// Require session token — defense in depth for a state-changing endpoint.
		accessCookie, err := r.Cookie("sAccessToken")
		if err != nil || accessCookie.Value == "" {
			sendError(w, http.StatusUnauthorized, "session required")
			return
		}
		if _, err := client.VerifySession(accessCookie.Value); err != nil {
			sendError(w, http.StatusUnauthorized, "invalid or expired session")
			return
		}
		authToken := "Bearer " + accessCookie.Value

		fee, err := fetchHealthcareServiceFee(baseURL, req.HealthcareServiceID, authToken)
		if err != nil {
			slog.Error("relay/booking: failed to fetch HealthcareService fee", "err", err)
			sendError(w, http.StatusBadGateway, "failed to fetch service fee")
			return
		}

		bundle := buildRelayBundle(req, fee)
		bundleBody, err := json.Marshal(bundle)
		if err != nil {
			slog.Error("relay/booking: failed to marshal bundle", "err", err)
			sendError(w, http.StatusInternalServerError, "internal error")
			return
		}

		fhirResp, err := postFHIRBundle(baseURL, bundleBody, authToken)
		if err != nil {
			slog.Error("relay/booking: backend error", "err", err)
			var ue *upstreamError
			if errors.As(err, &ue) {
				sendError(w, ue.StatusCode, ue.Message)
			} else {
				sendError(w, http.StatusBadGateway, err.Error())
			}
			return
		}

		result := parseRelayResponse(fhirResp, req.HealthcareServiceID, fee)
		if result.SlotID == "" || result.InvoiceID == "" {
			slog.Error("relay/booking: backend returned incomplete response",
				"slotId", result.SlotID, "invoiceId", result.InvoiceID)
			sendError(w, http.StatusBadGateway, "backend returned incomplete response")
			return
		}
		w.Header().Set(headerContentType, contentTypeJSON)
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(result)
	}
}

// sendError writes a JSON error response with the standard ErrorBody structure.
func sendError(w http.ResponseWriter, status int, message string) {
	w.Header().Set(headerContentType, contentTypeJSON)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
