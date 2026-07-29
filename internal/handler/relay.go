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
	BackendBaseURL   string
	AccessCookieName string
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
	SlotID                string `json:"slotId"`
	InvoiceID             string `json:"invoiceId"`
	Fee                   feeObj `json:"fee"`
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
	contentTypeJSON   = "application/json"
	headerContentType = "Content-Type"
)

// sendUpstreamError writes the most appropriate HTTP error for a FHIR upstream failure.
func sendUpstreamError(w http.ResponseWriter, err error) {
	var ue *upstreamError
	if errors.As(err, &ue) {
		sendError(w, ue.StatusCode, ue.Message)
	} else {
		sendError(w, http.StatusBadGateway, err.Error())
	}
}

// verifySession extracts and verifies the SuperTokens access token cookie.
// Returns a Bearer token on success.
func verifySession(r *http.Request, cookieName string) (string, error) {
	if cookieName == "" {
		cookieName = "sAccessToken"
	}
	accessCookie, err := r.Cookie(cookieName)
	if err != nil || accessCookie.Value == "" {
		return "", errors.New("session required")
	}
	if _, err := client.VerifySession(accessCookie.Value); err != nil {
		return "", errors.New("invalid or expired session")
	}
	return "Bearer " + accessCookie.Value, nil
}

// logRelayRequest logs the incoming relay booking request fields.
func logRelayRequest(req relayBookingRequest) {
	slog.Info("relay/booking",
		"scheduleId", req.ScheduleID,
		"patientId", req.PatientID,
		"practitionerRoleId", req.PractitionerRoleID,
		"healthcareServiceId", req.HealthcareServiceID,
		"date", req.Date,
		"startTime", req.StartTime,
		"endTime", req.EndTime,
	)
}

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

		logRelayRequest(req)

		authToken, err := verifySession(r, opts.AccessCookieName)
		if err != nil {
			sendError(w, http.StatusUnauthorized, err.Error())
			return
		}

		fee, err := fetchHealthcareServiceFee(baseURL, req.HealthcareServiceID, authToken)
		if err != nil {
			slog.Error("relay/booking: failed to fetch HealthcareService fee", "err", err)
			sendError(w, http.StatusBadGateway, "failed to fetch service fee")
			return
		}

		result, err := relayBundleAndParse(baseURL, req, fee, authToken)
		if err != nil {
			sendUpstreamError(w, err)
			return
		}
		w.Header().Set(headerContentType, contentTypeJSON)
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(result)
	}
}

// relayBundleAndParse marshals the bundle, POSTs it to the FHIR backend,
// parses the transaction response, and validates completeness.
func relayBundleAndParse(baseURL string, req relayBookingRequest, fee feeObj, authToken string) (relayResponse, error) {
	bundle := buildRelayBundle(req, fee)
	bundleBody, err := json.Marshal(bundle)
	if err != nil {
		slog.Error("relay/booking: failed to marshal bundle", "err", err)
		return relayResponse{}, errors.New("internal error")
	}

	fhirResp, err := postFHIRBundle(baseURL, bundleBody, authToken)
	if err != nil {
		slog.Error("relay/booking: backend error", "err", err)
		return relayResponse{}, err
	}

	result := parseRelayResponse(fhirResp, req.HealthcareServiceID, fee)
	if result.SlotID == "" || result.InvoiceID == "" {
		slog.Error("relay/booking: backend returned incomplete response",
			"slotId", result.SlotID, "invoiceId", result.InvoiceID)
		return relayResponse{}, errors.New("backend returned incomplete response")
	}
	return result, nil
}

// sendError writes a JSON error response with the standard ErrorBody structure.
func sendError(w http.ResponseWriter, status int, message string) {
	w.Header().Set(headerContentType, contentTypeJSON)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
