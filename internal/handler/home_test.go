package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/config"
	"github.com/konsulin-care/konsulin-app/internal/service"
	"github.com/konsulin-care/konsulin-app/internal/session"
)

func testConfig() *config.Config {
	return &config.Config{
		Port:                   "9999",
		AppName:               "Konsulin",
		AuthCookieName:        "auth",
		GuestSessionCookieName: "guest_session",
		CookieSecure:          false,
	}
}

func testSession(role string) *session.Session {
	return &session.Session{
		UserID:   "test-user",
		Role:     role,
		Roles:    []string{role},
		FullName: "Test User",
		Email:    "test@example.com",
		FHIRID:   "fhir-1",
	}
}

func TestHomeHandler_guest(t *testing.T) {
	svc := service.NewHomeService(service.NewStubProvider())
	handler := NewHomeHandler(testConfig(), svc)

	req := httptest.NewRequest(http.MethodGet, "/", http.NoBody)
	ctx := session.ContextWithSession(req.Context(), testSession("Guest"))
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Recommended for You") {
		t.Error("expected 'Recommended for You' section for guest")
	}
	if !strings.Contains(rec.Body.String(), "/auth?redirectToPath=/") {
		t.Error("expected login redirect on booking for guest")
	}
}

func TestHomeHandler_patient(t *testing.T) {
	svc := service.NewHomeService(service.NewStubProvider())
	handler := NewHomeHandler(testConfig(), svc)

	req := httptest.NewRequest(http.MethodGet, "/", http.NoBody)
	ctx := session.ContextWithSession(req.Context(), testSession("Patient"))
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Recommended for You") {
		t.Error("expected 'Recommended for You' section for patient")
	}
	if !strings.Contains(rec.Body.String(), "Test User") {
		t.Error("expected display name in response")
	}
	if strings.Contains(rec.Body.String(), "/auth?redirectToPath=/") {
		t.Error("patient should not see login-redirect booking links")
	}
}

func TestHomeHandler_practitioner(t *testing.T) {
	svc := service.NewHomeService(service.NewStubProvider())
	handler := NewHomeHandler(testConfig(), svc)

	req := httptest.NewRequest(http.MethodGet, "/", http.NoBody)
	ctx := session.ContextWithSession(req.Context(), testSession("Practitioner"))
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Today's Schedule") {
		t.Error("expected 'Today's Schedule' section for practitioner")
	}
	if !strings.Contains(rec.Body.String(), "SOAP Report") {
		t.Error("expected SOAP section for practitioner")
	}
	if !strings.Contains(rec.Body.String(), "Browse Instruments") {
		t.Error("expected instruments section for practitioner")
	}
}

func TestHomeHandler_admin(t *testing.T) {
	svc := service.NewHomeService(service.NewStubProvider())
	handler := NewHomeHandler(testConfig(), svc)

	req := httptest.NewRequest(http.MethodGet, "/", http.NoBody)
	sess := testSession("Clinic Admin")
	ctx := session.ContextWithSession(req.Context(), sess)
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Clinic Overview") {
		t.Error("expected 'Clinic Overview' section for admin")
	}
	if !strings.Contains(rec.Body.String(), "Practitioners") {
		t.Error("expected practitioner count for admin")
	}
	if !strings.Contains(rec.Body.String(), "Pending Approvals") {
		t.Error("expected pending approvals for admin")
	}
}

func TestHomeHandler_noSession(t *testing.T) {
	svc := service.NewHomeService(service.NewStubProvider())
	handler := NewHomeHandler(testConfig(), svc)

	req := httptest.NewRequest(http.MethodGet, "/", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusFound {
		t.Errorf("expected redirect (302), got %d", rec.Code)
	}
}

func TestHomeHandler_roleSwitcherHiddenForSingleRole(t *testing.T) {
	svc := service.NewHomeService(service.NewStubProvider())
	handler := NewHomeHandler(testConfig(), svc)

	req := httptest.NewRequest(http.MethodGet, "/", http.NoBody)
	sess := testSession("Patient")
	sess.Roles = []string{"Patient"}
	ctx := session.ContextWithSession(req.Context(), sess)
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if strings.Contains(rec.Body.String(), ">Role:</span>") {
		t.Error("role switcher should be hidden for single-role users")
	}
}
