package handler

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
)

// QuestionnaireCreateOptions configures the questionnaire create handler.
type QuestionnaireCreateOptions struct {
	BackendBaseURL   string
	AccessCookieName string
}

// maxQuestionnaireBodyBytes bounds the accepted questionnaire payload size.
// Questionnaires with many items (e.g. the Big Five Inventory) exceed the
// default 1 MiB http.Server limit, so allow up to 32 MiB.
const maxQuestionnaireBodyBytes = 32 << 20

// validateQuestionnaireCreate checks the payload is a draft Questionnaire.
func validateQuestionnaireCreate(payload map[string]any) string {
	if payload["resourceType"] != "Questionnaire" {
		return "resourceType must be Questionnaire"
	}
	if payload["status"] != "draft" {
		return "status must be draft"
	}
	return ""
}

// forwardQuestionnaire proxies the validated payload to the backend FHIR server.
func forwardQuestionnaire(
	w http.ResponseWriter,
	r *http.Request,
	baseURL string,
	body []byte,
	accessCookieName string,
) {
	targetURL := baseURL + "/fhir/Questionnaire"
	// nosemgrep — target host is fixed config (cfg.APIURL); path is a literal; no user input
	proxyReq, err := http.NewRequest(http.MethodPost, targetURL, strings.NewReader(string(body)))
	if err != nil {
		slog.Error("questionnaire create: failed to create request", "err", err)
		sendError(w, http.StatusInternalServerError, "proxy error")
		return
	}
	if contentType := r.Header.Get("Content-Type"); contentType != "" {
		proxyReq.Header.Set("Content-Type", contentType)
	}
	setAuthorizationFromRequest(proxyReq, r, targetURL, accessCookieName)
	proxyReq = proxyReq.WithContext(r.Context())

	// nolint:gosec // G704: intentional proxy — forwards to trusted backend
	resp, err := backendProxyClient.Do(proxyReq)
	if err != nil {
		slog.Warn("questionnaire create: upstream unreachable", "target", targetURL, "err", err)
		sendError(w, http.StatusBadGateway, "backend unreachable")
		return
	}
	defer func() { _ = resp.Body.Close() }()

	writeProxyResponse(w, resp, nil, false)
}

// NewQuestionnaireCreateHandler creates a handler for POST /proxy/fhir/Questionnaire.
// It requires the payload to be a FHIR R4 Questionnaire with status=draft
// (new assessments enter the catalog as drafts awaiting activation), then
// forwards the request body unchanged to the backend FHIR server.
func NewQuestionnaireCreateHandler(opts QuestionnaireCreateOptions) http.HandlerFunc {
	baseURL := strings.TrimRight(opts.BackendBaseURL, "/")

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			sendError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		body, err := io.ReadAll(io.LimitReader(r.Body, maxQuestionnaireBodyBytes+1))
		if err != nil {
			sendError(w, http.StatusBadRequest, "failed to read request body")
			return
		}
		if len(body) > maxQuestionnaireBodyBytes {
			sendError(w, http.StatusRequestEntityTooLarge, "questionnaire payload too large")
			return
		}

		var payload map[string]any
		if err := json.Unmarshal(body, &payload); err != nil {
			sendError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		if problem := validateQuestionnaireCreate(payload); problem != "" {
			sendError(w, http.StatusBadRequest, problem)
			return
		}

		forwardQuestionnaire(w, r, baseURL, body, opts.AccessCookieName)
	}
}
