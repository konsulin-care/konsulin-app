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

func assertLogoutResponse(t *testing.T, resp *http.Response, wantLoc string, wantKeys []string) {
	t.Helper()

	assertStatus(t, resp, http.StatusFound)

	loc := resp.Header.Get("Location")
	if loc != wantLoc {
		t.Errorf("expected Location %s, got %s", wantLoc, loc)
	}

	cookies := resp.Cookies()
	cleared := map[string]bool{}
	for _, c := range cookies {
		if c.MaxAge == -1 && c.Value == "" {
			cleared[c.Name] = true
		}
	}
	for _, key := range wantKeys {
		if !cleared[key] {
			t.Errorf("expected %s cookie to be cleared", key)
		}
	}
}

func TestLogoutHandler_clearsCookies(t *testing.T) {
	tests := []struct {
		name     string
		opts     LogoutOptions
		wantLoc  string
		wantKeys []string
	}{
		{
			name: "default cookie names",
			opts: LogoutOptions{
				AuthPath:          "/auth",
				CookieName:        "auth",
				AccessCookieName:  "sAccessToken",
				RefreshCookieName: "sRefreshToken",
				SecureCookie:      false,
			},
			wantLoc:  "/auth",
			wantKeys: []string{"auth", "sAccessToken", "sRefreshToken"},
		},
		{
			name: "custom cookie names",
			opts: LogoutOptions{
				AuthPath:          "/signin",
				CookieName:        "myAuth",
				AccessCookieName:  "myAccess",
				RefreshCookieName: "myRefresh",
				SecureCookie:      true,
			},
			wantLoc:  "/signin",
			wantKeys: []string{"myAuth", "myAccess", "myRefresh"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewLogoutHandler(tt.opts)
			server := newTestServer(t, handler)
			resp := testGet(t, server.URL+"/logout")
			assertLogoutResponse(t, resp, tt.wantLoc, tt.wantKeys)
		})
	}
}

func TestLogoutClient_hasTimeout(t *testing.T) {
	if logoutClient.Timeout <= 0 {
		t.Errorf("expected logout client timeout > 0, got %v", logoutClient.Timeout)
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
