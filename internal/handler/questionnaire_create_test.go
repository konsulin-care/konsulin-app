package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// testQuestionnaireBackend returns a mock FHIR server that captures
// Questionnaire create requests and returns a 201 Created response.
func testQuestionnaireBackend(t *testing.T) (*httptest.Server, *strings.Builder) {
	t.Helper()
	var captured strings.Builder
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/fhir/Questionnaire" && r.Method == http.MethodPost {
			body, err := io.ReadAll(r.Body)
			if err != nil {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			captured.Write(body)
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"resourceType":"Questionnaire","id":"q-1","status":"draft"}`))
			return
		}
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
	}))
	t.Cleanup(backend.Close)
	return backend, &captured
}

func newQuestionnaireCreateTestHandler(t *testing.T) (http.Handler, *strings.Builder) {
	t.Helper()
	backend, captured := testQuestionnaireBackend(t)
	handler := NewQuestionnaireCreateHandler(QuestionnaireCreateOptions{
		BackendBaseURL:          backend.URL,
		SuperadminKeyCookieName: "superadmin_key",
	})
	return handler, captured
}

// TestQuestionnaireCreateHandler_forwardsSuperadminKey verifies that when the
// BFF-held superadmin key cookie is present, the X-API-Key header is forwarded
// to the backend so superadmin requests (e.g. draft creation) authenticate.
func TestQuestionnaireCreateHandler_forwardsSuperadminKey(t *testing.T) {
	var gotKey string
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotKey = r.Header.Get("X-API-Key")
		w.Header().Set("Content-Type", "application/fhir+json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"resourceType":"Questionnaire","id":"q-1","status":"draft"}`))
	}))
	t.Cleanup(backend.Close)

	handler := NewQuestionnaireCreateHandler(QuestionnaireCreateOptions{
		BackendBaseURL:          backend.URL,
		SuperadminKeyCookieName: "superadmin_key",
	})

	body := `{"resourceType":"Questionnaire","id":"q-1","status":"draft","title":"Demo"}`
	req := httptest.NewRequest(http.MethodPost, "/proxy/fhir/Questionnaire", strings.NewReader(body))
	req.Header.Set("Cookie", "superadmin_key=sa-secret-123")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", rec.Code)
	}
	if gotKey != "sa-secret-123" {
		t.Errorf("expected backend to receive X-API-Key=sa-secret-123, got %q", gotKey)
	}
}

func TestQuestionnaireCreateHandler_acceptsDraftAndForwards(t *testing.T) {
	handler, captured := newQuestionnaireCreateTestHandler(t)

	body := `{"resourceType":"Questionnaire","id":"q-1","status":"draft","title":"Demo"}`
	req := httptest.NewRequest(http.MethodPost, "/proxy/fhir/Questionnaire", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/fhir+json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", rec.Code)
	}
	if !strings.Contains(captured.String(), `"status":"draft"`) {
		t.Errorf("expected original payload forwarded to backend, got %s", captured.String())
	}
	if !strings.Contains(rec.Body.String(), `"resourceType":"Questionnaire"`) {
		t.Errorf("expected backend response proxied back, got %s", rec.Body.String())
	}
}

func TestQuestionnaireCreateHandler_rejectsNonDraft(t *testing.T) {
	handler, captured := newQuestionnaireCreateTestHandler(t)
	before := captured.Len()

	body := `{"resourceType":"Questionnaire","id":"q-2","status":"active"}`
	req := httptest.NewRequest(http.MethodPost, "/proxy/fhir/Questionnaire", strings.NewReader(body))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "draft") {
		t.Errorf("expected error message mentioning draft, got %s", rec.Body.String())
	}
	if captured.Len() != before {
		t.Errorf("expected no payload forwarded to backend, but got %s", captured.String()[before:])
	}
}

func TestQuestionnaireCreateHandler_rejectsNonQuestionnaireResource(t *testing.T) {
	handler, captured := newQuestionnaireCreateTestHandler(t)
	before := captured.Len()

	body := `{"resourceType":"Patient","id":"p-1","status":"draft"}`
	req := httptest.NewRequest(http.MethodPost, "/proxy/fhir/Questionnaire", strings.NewReader(body))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
	if captured.Len() != before {
		t.Errorf("expected no payload forwarded to backend")
	}
}

func TestQuestionnaireCreateHandler_rejectsInvalidJSON(t *testing.T) {
	handler, _ := newQuestionnaireCreateTestHandler(t)

	req := httptest.NewRequest(http.MethodPost, "/proxy/fhir/Questionnaire", strings.NewReader("not json"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestQuestionnaireCreateHandler_rejectsNonPostMethod(t *testing.T) {
	handler, _ := newQuestionnaireCreateTestHandler(t)

	req := httptest.NewRequest(http.MethodGet, "/proxy/fhir/Questionnaire", http.NoBody)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rec.Code)
	}
}
