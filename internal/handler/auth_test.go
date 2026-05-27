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

const testSecret = "handler-test-secret"

var noRedirectClient = &http.Client{
	CheckRedirect: func(*http.Request, []*http.Request) error {
		return http.ErrUseLastResponse
	},
}

func newAuthRouter() *chi.Mux {
	r := chi.NewRouter()
	r.Use(middleware.AuthGuard(middleware.AuthGuardOptions{
		AuthPath:     "/auth",
		CookieName:   "auth",
		CookieSecret: testSecret,
	}))
	return r
}

func signedCookieValue(value string) string {
	return url.QueryEscape(session.SignCookieValue(value, testSecret))
}

func newTestServer(t *testing.T, handler http.Handler) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	return srv
}

func testGet(t *testing.T, url string) *http.Response {
	t.Helper()
	resp, err := noRedirectClient.Get(url)
	if err != nil {
		t.Fatalf("GET %s failed: %v", url, err)
	}
	t.Cleanup(func() { resp.Body.Close() })
	return resp
}

func testDo(t *testing.T, req *http.Request) *http.Response {
	t.Helper()
	resp, err := noRedirectClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s failed: %v", req.Method, req.URL, err)
	}
	t.Cleanup(func() { resp.Body.Close() })
	return resp
}

func assertStatus(t *testing.T, resp *http.Response, want int) {
	t.Helper()
	if resp.StatusCode != want {
		t.Errorf("expected status %d, got %d", want, resp.StatusCode)
	}
}

func TestProtectedRoute_redirectsWithoutAuth(t *testing.T) {
	r := newAuthRouter()
	r.Get("/profile", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	server := newTestServer(t, r)
	resp := testGet(t, server.URL+"/profile")

	assertStatus(t, resp, http.StatusFound)

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
	if parsed.Query().Get("redirectToPath") != "/profile" {
		t.Errorf("expected redirectToPath=/profile, got %s", parsed.Query().Get("redirectToPath"))
	}
}

func TestProtectedRoute_allowsWithValidAuth(t *testing.T) {
	r := newAuthRouter()
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
	cookieVal := signedCookieValue(string(authJSON))

	server := newTestServer(t, r)
	req, err := http.NewRequest(http.MethodGet, server.URL+"/profile", http.NoBody)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	req.Header.Set("Cookie", "auth="+cookieVal)

	resp := testDo(t, req)

	assertStatus(t, resp, http.StatusOK)
	if gotSession == nil {
		t.Fatal("expected session to be set")
	}
	if gotSession.UserID != "u1" {
		t.Errorf("expected UserID u1, got %q", gotSession.UserID)
	}
}

func TestAuthRoutes_notGuarded(t *testing.T) {
	paths := []string{"/auth", "/auth/login"}
	for _, p := range paths {
		t.Run(p, func(t *testing.T) {
			r := newAuthRouter()
			r.Get(p, func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			server := newTestServer(t, r)
			resp := testGet(t, server.URL+p)

			assertStatus(t, resp, http.StatusOK)
		})
	}
}

func TestLogoutHandler_clearsCookies(t *testing.T) {
	handler := NewLogoutHandler(LogoutOptions{
		AuthPath:     "/auth",
		CookieName:   "auth",
		SecureCookie: false,
	})

	server := newTestServer(t, handler)
	resp := testGet(t, server.URL+"/logout")

	assertStatus(t, resp, http.StatusFound)

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
	r := newAuthRouter()
	r.Get("/profile", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	server := newTestServer(t, r)
	req, err := http.NewRequest(http.MethodGet, server.URL+"/profile", http.NoBody)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	req.Header.Set("HX-Request", "true")

	resp := testDo(t, req)

	assertStatus(t, resp, http.StatusOK)

	hxRedirect := resp.Header.Get("HX-Redirect")
	if hxRedirect == "" {
		t.Fatal("expected HX-Redirect header")
	}
	if !strings.Contains(hxRedirect, "/auth?redirectToPath=") {
		t.Errorf("expected HX-Redirect to contain /auth?redirectToPath=, got %s", hxRedirect)
	}
}
