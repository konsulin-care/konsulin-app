package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/konsulin-care/konsulin-app/internal/session"
)

const redirectTestSecret = "redirect-authenticated-test-secret"

func signedRedirectCookie(value string) string {
	return session.SignCookieValue(value, redirectTestSecret)
}

func setupRedirectAuthenticatedTest(secret string) *chi.Mux {
	if secret == "" {
		secret = redirectTestSecret
	}
	r := chi.NewRouter()
	r.Route("/auth", func(r chi.Router) {
		r.Use(RedirectAuthenticated("auth", secret, "/"))
		r.Get("/", func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		})
		r.Get("/*", func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		})
	})
	return r
}

func TestRedirectAuthenticated_verifyBypass_noAuthCookie_passesThrough(t *testing.T) {
	r := setupRedirectAuthenticatedTest(redirectTestSecret)
	server := httptest.NewServer(r)
	t.Cleanup(server.Close)

	// Unauthenticated request to /auth/verify should pass through
	resp, err := http.Get(server.URL + "/auth/verify?preAuthSessionId=test123&tenantId=public")
	if err != nil {
		t.Fatalf("GET /auth/verify failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK for unauthenticated /auth/verify, got %d", resp.StatusCode)
	}
}

func TestRedirectAuthenticated_verifyBypass_withAuthCookie_passesThrough(t *testing.T) {
	r := setupRedirectAuthenticatedTest(redirectTestSecret)
	server := httptest.NewServer(r)
	t.Cleanup(server.Close)

	// Authenticated request to /auth/verify should NOT redirect — linkCode is in
	// the URL fragment and requires the frontend SDK to process it client-side.
	authJSON, _ := json.Marshal(map[string]string{"userId": "u1", "role_name": "Patient"})
	cookieVal := signedRedirectCookie(string(authJSON))

	req, _ := http.NewRequest(http.MethodGet, server.URL+"/auth/verify?preAuthSessionId=test123&tenantId=public", http.NoBody)
	req.Header.Set("Cookie", "auth="+cookieVal)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET /auth/verify failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK for /auth/verify with valid auth cookie, got %d", resp.StatusCode)
	}
}

func TestRedirectAuthenticated_nonVerifyPaths_redirectAuthenticated(t *testing.T) {
	tests := []struct {
		name string
		path string
	}{
		{name: "auth root", path: "/auth"},
		{name: "auth signin", path: "/auth/signin"},
		{name: "auth other path", path: "/auth/somethingelse"},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			r := setupRedirectAuthenticatedTest(redirectTestSecret)
			server := httptest.NewServer(r)
			t.Cleanup(server.Close)

			authJSON, _ := json.Marshal(map[string]string{"userId": "u1", "role_name": "Patient"})
			cookieVal := signedRedirectCookie(string(authJSON))

			req, _ := http.NewRequest(http.MethodGet, server.URL+tt.path, http.NoBody)
			req.Header.Set("Cookie", "auth="+cookieVal)

			httpClient := &http.Client{
				CheckRedirect: func(req *http.Request, via []*http.Request) error {
					return http.ErrUseLastResponse
				},
			}
			resp, err := httpClient.Do(req)
			if err != nil {
				t.Fatalf("GET %s failed: %v", tt.path, err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusFound {
				t.Errorf("expected 302 Found for authenticated %s, got %d", tt.path, resp.StatusCode)
			}
			loc := resp.Header.Get("Location")
			if loc != "/" {
				t.Errorf("expected Location / for %s, got %q", tt.path, loc)
			}
		})
	}
}

func TestRedirectAuthenticated_unauthenticated_passesThrough(t *testing.T) {
	r := setupRedirectAuthenticatedTest(redirectTestSecret)
	server := httptest.NewServer(r)
	t.Cleanup(server.Close)

	// Unauthenticated user visiting /auth should pass through
	resp, err := http.Get(server.URL + "/auth")
	if err != nil {
		t.Fatalf("GET /auth failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK for unauthenticated /auth, got %d", resp.StatusCode)
	}
}
