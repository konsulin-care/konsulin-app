package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// setupQuestionnaireRoutes builds the full router with a mock FHIR backend.
func setupQuestionnaireRoutes(t *testing.T) (http.Handler, *mockQuestionnaireBackend) {
	t.Helper()
	backend := newMockQuestionnaireBackend(t)

	tmpDir := t.TempDir()
	t.Chdir(tmpDir)

	csrfKey := "01234567890123456789012345678901"
	cfg := newTestConfig(t, csrfKey)
	cfg.NextjsURL = "http://127.0.0.1:19999"
	cfg.APIURL = backend.URL

	handler, err := routes(cfg)
	if err != nil {
		t.Fatalf("routes() failed: %v", err)
	}
	return handler, backend
}

type mockQuestionnaireBackend struct {
	*httptest.Server
	lastMethod string
	lastPath   string
}

// newMockQuestionnaireBackend records requests and answers FHIR-style.
func newMockQuestionnaireBackend(t *testing.T) *mockQuestionnaireBackend {
	t.Helper()
	backend := &mockQuestionnaireBackend{}
	backend.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		backend.lastMethod = r.Method
		backend.lastPath = r.URL.Path

		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/fhir/Questionnaire":
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"resourceType":"Bundle","total":0}`))
		case r.Method == http.MethodPost && r.URL.Path == "/fhir/Questionnaire":
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"resourceType":"Questionnaire","id":"q-1","status":"draft"}`))
		case r.Method == http.MethodPut:
			w.Header().Set("Content-Type", "application/fhir+json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"resourceType":"Questionnaire","id":"q-1"}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	t.Cleanup(backend.Close)
	return backend
}

func TestRoutes_questionnaireCreate_acceptsDraft(t *testing.T) {
	handler, backend := setupQuestionnaireRoutes(t)

	body := `{"resourceType":"Questionnaire","id":"q-1","status":"draft","title":"Demo"}`
	req := httptest.NewRequest(http.MethodPost, "/proxy/fhir/Questionnaire", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/fhir+json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", rec.Code)
	}
	if backend.lastPath != "/fhir/Questionnaire" {
		t.Errorf("expected forwarded path /fhir/Questionnaire, got %q", backend.lastPath)
	}
}

func TestRoutes_questionnaireCreate_rejectsNonDraft(t *testing.T) {
	handler, _ := setupQuestionnaireRoutes(t)

	body := `{"resourceType":"Questionnaire","id":"q-2","status":"active"}`
	req := httptest.NewRequest(http.MethodPost, "/proxy/fhir/Questionnaire", strings.NewReader(body))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "draft") {
		t.Errorf("expected error mentioning draft, got %s", rec.Body.String())
	}
}

func TestRoutes_questionnairePassThrough_stillWorks(t *testing.T) {
	handler, backend := setupQuestionnaireRoutes(t)

	t.Run("GET list goes through the generic proxy", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/proxy/fhir/Questionnaire?context=regular", http.NoBody)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rec.Code)
		}
		if backend.lastMethod != http.MethodGet || backend.lastPath != "/fhir/Questionnaire" {
			t.Errorf("expected GET /fhir/Questionnaire forwarded, got %s %s", backend.lastMethod, backend.lastPath)
		}
	})

	t.Run("PUT update goes through the generic proxy", func(t *testing.T) {
		body := `{"resourceType":"Questionnaire","id":"q-1","status":"active"}`
		req := httptest.NewRequest(http.MethodPut, "/proxy/fhir/Questionnaire/q-1", strings.NewReader(body))
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rec.Code)
		}
		if backend.lastMethod != http.MethodPut || backend.lastPath != "/fhir/Questionnaire/q-1" {
			t.Errorf("expected PUT /fhir/Questionnaire/q-1 forwarded, got %s %s", backend.lastMethod, backend.lastPath)
		}
	})
}
