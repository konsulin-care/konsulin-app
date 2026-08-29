package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/session"
)

// testJWTClinicAdmin is a full JWT (header.payload.sig) with payload
// {"sub":"test-user","exp":9999999999,"st-role":{"v":["Patient","Practitioner","Clinic Admin"]}}
const testJWTClinicAdmin = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJleHAiOjk5OTk5OTk5OTksInN0LXJvbGUiOnsidiI6WyJQYXRpZW50IiwiUHJhY3RpdGlvbmVyIiwiQ2xpbmljIEFkbWluIl19fQ.ZmFrZS1zaWc"

// testJWTPatientOnly is a full JWT (header.payload.sig) with payload
// {"sub":"test-user","exp":9999999999,"st-role":{"v":["Patient"]}}
const testJWTPatientOnly = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJleHAiOjk5OTk5OTk5OTksInN0LXJvbGUiOnsidiI6WyJQYXRpZW50Il19fQ.ZmFrZS1zaWc"

// roleSwitchHandlerWithSession wraps the role switch handler, injecting session from auth cookie.
func roleSwitchHandlerWithSession(opts RoleSwitchOptions) http.HandlerFunc {
	handler := NewRoleSwitchHandler(opts)
	return func(w http.ResponseWriter, r *http.Request) {
		sess, err := session.ExtractFromRequest(r, opts.CookieName, opts.CookieSecret)
		if err == nil {
			ctx := session.ContextWithSession(r.Context(), sess)
			r = r.WithContext(ctx)
		} else {
			ctx := session.ContextWithSession(r.Context(), &session.Session{Role: "Guest"})
			r = r.WithContext(ctx)
		}
		handler(w, r)
	}
}

func newRoleSwitchServer(t *testing.T, opts RoleSwitchOptions) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/auth/role/switch", roleSwitchHandlerWithSession(opts))
	return httptest.NewServer(mux)
}

func encodeAuthCookie(t *testing.T, s *session.Session) *http.Cookie {
	t.Helper()
	encoded, err := session.EncodeSession(s, "auth")
	if err != nil {
		t.Fatalf("failed to encode session: %v", err)
	}
	return &http.Cookie{Name: "auth", Value: encoded}
}

func mustPostRoleSwitch(t *testing.T, srv *httptest.Server, role string, cookies ...*http.Cookie) *http.Response {
	t.Helper()
	form := url.Values{"role": {role}}
	req, err := http.NewRequest(http.MethodPost, srv.URL+"/auth/role/switch", strings.NewReader(form.Encode()))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	for _, c := range cookies {
		req.AddCookie(c)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { resp.Body.Close() })
	return resp
}

// newBackendServer creates a test backend that validates the active-role side-call.
func newBackendServer(t *testing.T, expectedRole string, called *bool) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*called = true
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if !strings.HasSuffix(r.URL.Path, "/api/v1/auth/active-role") {
			t.Errorf("expected /api/v1/auth/active-role, got %s", r.URL.Path)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("expected Content-Type application/json, got %s", r.Header.Get("Content-Type"))
		}
		if r.Header.Get("rid") != "anti-csrf" {
			t.Errorf("expected rid anti-csrf, got %s", r.Header.Get("rid"))
		}
		var body struct {
			Role string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("failed to decode body: %v", err)
			return
		}
		if body.Role != expectedRole {
			t.Errorf("expected role %q, got %q", expectedRole, body.Role)
		}
		w.Header().Add("Set-Cookie", "sAccessToken=new-token; Path=/")
		w.Header().Add("Set-Cookie", "sFrontToken=new-front; Path=/")
		w.WriteHeader(http.StatusOK)
	}))
}

func TestRoleSwitchActiveRoleInJWT(t *testing.T) {
	// Access token fallback has been removed for security.
	// Role must now be present in the server-signed session cookie.
	srv := newRoleSwitchServer(t, RoleSwitchOptions{
		CookieName:   "auth",
		CookieSecure: false,
		CookieSecret: cookieTestSecret,
	})
	defer srv.Close()

	cookieSession := &session.Session{
		UserID: "test-user",
		Roles:  []string{"Practitioner"},
		Role:   "Practitioner",
	}
	authCookie := encodeAuthCookie(t, cookieSession)
	jwtCookie := &http.Cookie{
		Name:  "sAccessToken",
		Value: testJWTClinicAdmin,
	}

	// Role "Clinic Admin" is in JWT but NOT in session cookie → should be rejected
	resp := mustPostRoleSwitch(t, srv, "Clinic Admin", authCookie, jwtCookie)
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestRoleSwitchActiveRoleInCookie(t *testing.T) {
	var called bool
	backend := newBackendServer(t, "Clinic Admin", &called)
	defer backend.Close()

	srv := newRoleSwitchServer(t, RoleSwitchOptions{
		CookieName:     "auth",
		CookieSecure:   false,
		CookieSecret:   cookieTestSecret,
		BackendBaseURL: backend.URL,
	})
	defer srv.Close()

	cookieSession := &session.Session{
		UserID: "test-user",
		Roles:  []string{"Practitioner", "Clinic Admin"},
		Role:   "Practitioner",
	}
	authCookie := encodeAuthCookie(t, cookieSession)

	resp := mustPostRoleSwitch(t, srv, "Clinic Admin", authCookie)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK, got %d", resp.StatusCode)
	}
	if !called {
		t.Error("expected backend to be called for active-role claim update")
	}
	// Backend Set-Cookie headers (re-issued SuperTokens tokens) are forwarded.
	if c := findCookie(resp, "sAccessToken"); c == nil || c.Value != "new-token" {
		t.Errorf("expected forwarded sAccessToken cookie, got %+v", c)
	}
	if c := findCookie(resp, "sFrontToken"); c == nil || c.Value != "new-front" {
		t.Errorf("expected forwarded sFrontToken cookie, got %+v", c)
	}
	// Auth cookie is committed to the new role only after the claim sync.
	updated := findCookie(resp, "auth")
	if updated == nil {
		t.Fatal("expected updated auth cookie")
	}
	sess := extractSessionFromCookie(t, updated)
	if sess.Role != "Clinic Admin" {
		t.Errorf("expected cookie role Clinic Admin, got %q", sess.Role)
	}
}

func TestRoleSwitchRejectsInvalidRole(t *testing.T) {
	srv := newRoleSwitchServer(t, RoleSwitchOptions{
		CookieName:   "auth",
		CookieSecure: false,
		CookieSecret: cookieTestSecret,
	})
	defer srv.Close()

	cookieSession := &session.Session{
		UserID: "test-user",
		Roles:  []string{"Practitioner"},
		Role:   "Practitioner",
	}
	authCookie := encodeAuthCookie(t, cookieSession)

	var called bool
	backend := newBackendServer(t, "", &called)
	defer backend.Close()

	resp := mustPostRoleSwitch(t, srv, "Clinic Admin", authCookie)
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
	if called {
		t.Error("expected backend NOT to be called for invalid role")
	}
}

func TestRoleSwitchRejectsRoleNotInSession(t *testing.T) {
	tests := []struct {
		name      string
		jwtCookie *http.Cookie
	}{
		{name: "with JWT claim present", jwtCookie: &http.Cookie{Name: "sAccessToken", Value: testJWTPatientOnly}},
		{name: "without JWT cookie", jwtCookie: nil},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			srv := newRoleSwitchServer(t, RoleSwitchOptions{
				CookieName:   "auth",
				CookieSecure: false,
				CookieSecret: cookieTestSecret,
			})
			defer srv.Close()

			cookieSession := &session.Session{
				UserID: "test-user",
				Roles:  []string{"Practitioner"},
				Role:   "Practitioner",
			}
			authCookie := encodeAuthCookie(t, cookieSession)

			var resp *http.Response
			if tc.jwtCookie == nil {
				resp = mustPostRoleSwitch(t, srv, "Clinic Admin", authCookie)
			} else {
				resp = mustPostRoleSwitch(t, srv, "Clinic Admin", authCookie, tc.jwtCookie)
			}
			if resp.StatusCode != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", resp.StatusCode)
			}
		})
	}
}

// assertSwitchFailsClosed posts a role switch with the given options and
// requires a 502 with no auth cookie write (fail-closed on claim sync failure).
func assertSwitchFailsClosed(t *testing.T, opts RoleSwitchOptions) {
	t.Helper()
	srv := newRoleSwitchServer(t, opts)
	defer srv.Close()

	cookieSession := &session.Session{
		UserID: "test-user",
		Roles:  []string{"Practitioner", "Clinic Admin"},
		Role:   "Practitioner",
	}

	resp := mustPostRoleSwitch(t, srv, "Clinic Admin", encodeAuthCookie(t, cookieSession))
	if resp.StatusCode != http.StatusBadGateway {
		t.Errorf("expected 502, got %d", resp.StatusCode)
	}
	if findCookie(resp, "auth") != nil {
		t.Error("expected auth cookie unchanged when claim sync fails")
	}
}

func TestRoleSwitchBackendRejects(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer backend.Close()
	assertSwitchFailsClosed(t, RoleSwitchOptions{
		CookieName:     "auth",
		CookieSecure:   false,
		CookieSecret:   cookieTestSecret,
		BackendBaseURL: backend.URL,
	})
}

func TestRoleSwitchBackendUnreachable(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	backend.Close()
	assertSwitchFailsClosed(t, RoleSwitchOptions{
		CookieName:     "auth",
		CookieSecure:   false,
		CookieSecret:   cookieTestSecret,
		BackendBaseURL: backend.URL,
	})
}

func TestRoleSwitchNoBackendBaseURL(t *testing.T) {
	assertSwitchFailsClosed(t, RoleSwitchOptions{
		CookieName:     "auth",
		CookieSecure:   false,
		CookieSecret:   cookieTestSecret,
		BackendBaseURL: "",
	})
}
