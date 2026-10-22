package middleware

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/konsulin-care/konsulin-app/internal/session"
)

const testSecret = "optional-auth-test-secret"

func signedCookieValue(value string) string {
	return url.QueryEscape(session.SignCookieValue(value, testSecret))
}

func makeAnonSessionJWT(guestID string) string {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256"}`))
	payload := base64.RawURLEncoding.EncodeToString([]byte(`{"guest_id":"` + guestID + `"}`))
	return header + "." + payload + ".test-sig"
}

func newOptionalAuthRouter() *chi.Mux {
	r := chi.NewRouter()
	r.Use(OptionalAuth(OptionalAuthOptions{
		AuthCookieName:        "auth",
		AnonSessionCookieName: "anon_session",
		CookieSecret:          testSecret,
	}))
	return r
}

func setupOptionalAuthTest(t *testing.T) (*httptest.Server, func() *session.Session) {
	t.Helper()
	r := newOptionalAuthRouter()
	var captured *session.Session
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		var ok bool
		captured, ok = session.SessionFromContext(r.Context())
		if !ok {
			t.Error("expected session in context")
		}
		w.WriteHeader(http.StatusOK)
	})
	server := httptest.NewServer(r)
	t.Cleanup(server.Close)
	return server, func() *session.Session { return captured }
}

func TestOptionalAuth_noCookies_guestFallback(t *testing.T) {
	server, getSession := setupOptionalAuthTest(t)

	resp, err := http.Get(server.URL + "/")
	if err != nil {
		t.Fatalf("GET / failed: %v", err)
	}
	resp.Body.Close()
	gotSession := getSession()
	if gotSession == nil {
		t.Fatal("expected session to be set")
		return
	}
	if gotSession.Role != "Guest" {
		t.Errorf("expected Role Guest, got %q", gotSession.Role)
	}
	if gotSession.GuestID != "" {
		t.Errorf("expected empty GuestID for unauthenticated request, got %q", gotSession.GuestID)
	}
}

func TestOptionalAuth_authCookie_realSession(t *testing.T) {
	server, getSession := setupOptionalAuthTest(t)

	authJSON, _ := json.Marshal(map[string]string{"userId": "u1", "role_name": "Patient"})
	cookieVal := signedCookieValue(string(authJSON))
	req, _ := http.NewRequest(http.MethodGet, server.URL+"/", http.NoBody)
	req.Header.Set("Cookie", "auth="+cookieVal)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET / failed: %v", err)
	}
	resp.Body.Close()
	gotSession := getSession()
	if gotSession == nil {
		t.Fatal("expected session to be set")
		return
	}
	if gotSession.UserID != "u1" {
		t.Errorf("expected UserID u1, got %q", gotSession.UserID)
	}
	if gotSession.Role != "Patient" {
		t.Errorf("expected Role Patient, got %q", gotSession.Role)
	}
}

func TestOptionalAuth_anonCookie_guestSession(t *testing.T) {
	server, getSession := setupOptionalAuthTest(t)

	jwt := makeAnonSessionJWT("existing-guest-xyz")
	req, _ := http.NewRequest(http.MethodGet, server.URL+"/", http.NoBody)
	req.Header.Set("Cookie", "anon_session="+jwt)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET / failed: %v", err)
	}
	resp.Body.Close()
	gotSession := getSession()
	if gotSession == nil {
		t.Fatal("expected session to be set")
		return
	}
	if gotSession.Role != "Guest" {
		t.Errorf("expected Role Guest, got %q", gotSession.Role)
	}
	if gotSession.GuestID != "existing-guest-xyz" {
		t.Errorf("expected GuestID existing-guest-xyz, got %q", gotSession.GuestID)
	}
}

func TestOptionalAuth_authCookieOverridesAnon(t *testing.T) {
	server, getSession := setupOptionalAuthTest(t)

	authJSON, _ := json.Marshal(map[string]string{
		"userId":    "u1",
		"role_name": "Practitioner",
	})
	authCookieVal := signedCookieValue(string(authJSON))
	anonJWT := makeAnonSessionJWT("guest-123")

	req, err := http.NewRequest(http.MethodGet, server.URL+"/", http.NoBody)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	req.Header.Set("Cookie", "auth="+authCookieVal+"; anon_session="+anonJWT)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET / failed: %v", err)
	}
	resp.Body.Close()

	gotSession := getSession()
	if gotSession == nil {
		t.Fatal("expected session to be set")
		return
	}
	if gotSession.UserID != "u1" {
		t.Errorf("expected UserID u1, got %q", gotSession.UserID)
	}
	if gotSession.Role != "Practitioner" {
		t.Errorf("expected Role Practitioner, got %q", gotSession.Role)
	}
	if gotSession.GuestID != "" {
		t.Errorf("expected empty GuestID for real session, got %q", gotSession.GuestID)
	}
}
