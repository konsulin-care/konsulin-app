package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/konsulin-care/konsulin-app/internal/middleware"
	"github.com/konsulin-care/konsulin-app/internal/session"
)

func noRedirectClient() *http.Client {
	return &http.Client{
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

func TestProtectedRoute_redirectsWithoutAuth(t *testing.T) {
	r := chi.NewRouter()
	r.Use(middleware.AuthGuard(middleware.AuthGuardOptions{
		AuthPath:   "/auth",
		CookieName: "auth",
	}))
	r.Get("/profile", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	server := httptest.NewServer(r)
	defer server.Close()

	client := noRedirectClient()
	resp, err := client.Get(server.URL + "/profile")
	if err != nil {
		t.Fatalf("GET /profile failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusFound {
		t.Errorf("expected status 302, got %d", resp.StatusCode)
	}

	loc := resp.Header.Get("Location")
	if loc == "" {
		t.Fatal("expected Location header")
	}
	parsed, err := url.Parse(loc)
	if err != nil {
		t.Fatalf("failed to parse Location: %v", err)
	}
	if parsed.Path != "/auth" {
		t.Errorf("expected redirect to /auth, got %s", parsed.Path)
	}
	if parsed.Query().Get("redirect") != "/profile" {
		t.Errorf("expected redirect=/profile, got %s", parsed.Query().Get("redirect"))
	}
}

func TestProtectedRoute_allowsWithValidAuth(t *testing.T) {
	r := chi.NewRouter()
	r.Use(middleware.AuthGuard(middleware.AuthGuardOptions{
		AuthPath:   "/auth",
		CookieName: "auth",
	}))

	var gotSession *session.Session
	r.Get("/profile", func(w http.ResponseWriter, r *http.Request) {
		s, ok := session.SessionFromContext(r.Context())
		if !ok {
			t.Error("expected session in context")
		}
		gotSession = s
		w.WriteHeader(http.StatusOK)
	})

	authJSON, _ := json.Marshal(map[string]string{
		"userId":    "u1",
		"role_name": "Patient",
	})
	encoded := url.QueryEscape(string(authJSON))

	server := httptest.NewServer(r)
	defer server.Close()

	req, err := http.NewRequest(http.MethodGet, server.URL+"/profile", nil)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	req.Header.Set("Cookie", "auth="+encoded)

	client := noRedirectClient()
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("GET /profile failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
	if gotSession == nil {
		t.Fatal("expected session to be set")
	}
	if gotSession.UserID != "u1" {
		t.Errorf("expected UserID u1, got %q", gotSession.UserID)
	}
}

func TestAuthRoute_notGuarded(t *testing.T) {
	r := chi.NewRouter()
	r.Use(middleware.AuthGuard(middleware.AuthGuardOptions{
		AuthPath:   "/auth",
		CookieName: "auth",
	}))
	r.Get("/auth", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	server := httptest.NewServer(r)
	defer server.Close()

	client := noRedirectClient()
	resp, err := client.Get(server.URL + "/auth")
	if err != nil {
		t.Fatalf("GET /auth failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestAuthSubRoute_notGuarded(t *testing.T) {
	r := chi.NewRouter()
	r.Use(middleware.AuthGuard(middleware.AuthGuardOptions{
		AuthPath:   "/auth",
		CookieName: "auth",
	}))
	r.Get("/auth/login", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	server := httptest.NewServer(r)
	defer server.Close()

	client := noRedirectClient()
	resp, err := client.Get(server.URL + "/auth/login")
	if err != nil {
		t.Fatalf("GET /auth/login failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestLogoutHandler_clearsCookies(t *testing.T) {
	handler := NewLogoutHandler(LogoutOptions{
		AuthPath:   "/auth",
		CookieName: "auth",
	})

	server := httptest.NewServer(handler)
	defer server.Close()

	client := noRedirectClient()
	resp, err := client.Get(server.URL + "/logout")
	if err != nil {
		t.Fatalf("GET /logout failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusFound {
		t.Errorf("expected status 302, got %d", resp.StatusCode)
	}

	loc := resp.Header.Get("Location")
	if loc != "/auth" {
		t.Errorf("expected Location /auth, got %s", loc)
	}

	cookies := resp.Cookies()
	cleared := map[string]bool{}
	for _, c := range cookies {
		if c.MaxAge == -1 && c.Value == "" {
			cleared[c.Name] = true
		}
	}
	if !cleared["auth"] {
		t.Error("expected auth cookie to be cleared")
	}
	if !cleared["sAccessToken"] {
		t.Error("expected sAccessToken cookie to be cleared")
	}
	if !cleared["sRefreshToken"] {
		t.Error("expected sRefreshToken cookie to be cleared")
	}
}

func TestHTMXProtectedRoute_redirectsViaHeader(t *testing.T) {
	r := chi.NewRouter()
	r.Use(middleware.AuthGuard(middleware.AuthGuardOptions{
		AuthPath:   "/auth",
		CookieName: "auth",
	}))
	r.Get("/profile", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	server := httptest.NewServer(r)
	defer server.Close()

	req, err := http.NewRequest(http.MethodGet, server.URL+"/profile", nil)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	req.Header.Set("HX-Request", "true")

	client := noRedirectClient()
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("GET /profile failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200 (HTMX redirect via header), got %d", resp.StatusCode)
	}

	hxRedirect := resp.Header.Get("HX-Redirect")
	if hxRedirect == "" {
		t.Fatal("expected HX-Redirect header")
	}
	if !strings.Contains(hxRedirect, "/auth?redirect=") {
		t.Errorf("expected HX-Redirect to contain /auth?redirect=, got %s", hxRedirect)
	}
}
