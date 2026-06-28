package handler

import (
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
		// Extract session from auth cookie (like OptionalAuth does)
		sess, err := session.ExtractFromRequest(r, opts.CookieName, opts.CookieSecret)
		if err == nil {
			ctx := session.ContextWithSession(r.Context(), sess)
			r = r.WithContext(ctx)
		} else {
			// No valid session — inject Guest
			ctx := session.ContextWithSession(r.Context(), &session.Session{Role: "Guest"})
			r = r.WithContext(ctx)
		}
		handler(w, r)
	}
}

func newRoleSwitchServer(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/auth/role/switch", roleSwitchHandlerWithSession(RoleSwitchOptions{
		CookieName:   "auth",
		CookieSecure: false,
		CookieSecret: cookieTestSecret,
	}))
	return httptest.NewServer(mux)
}

// encodeAuthCookie creates a signed auth cookie value for the given session.
func encodeAuthCookie(t *testing.T, s *session.Session) *http.Cookie {
	t.Helper()
	encoded, err := session.EncodeSession(s, "auth")
	if err != nil {
		t.Fatalf("failed to encode session: %v", err)
	}
	return &http.Cookie{Name: "auth", Value: encoded}
}

// mustPostRoleSwitch sends a POST request to /auth/role/switch with the given role.
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

func TestRoleSwitchWithJWTFallback(t *testing.T) {
	srv := newRoleSwitchServer(t)

	t.Run("switches to role found in JWT but not in cookie", func(t *testing.T) {
		// Cookie has only Practitioner role
		cookieSession := &session.Session{
			UserID: "test-user",
			Roles:  []string{"Practitioner"},
			Role:   "Practitioner",
		}
		authCookie := encodeAuthCookie(t, cookieSession)

		// sAccessToken JWT has Practitioner + Clinic Admin
		jwtCookie := &http.Cookie{
			Name:  "sAccessToken",
			Value: testJWTClinicAdmin,
		}

		resp := mustPostRoleSwitch(t, srv, "Clinic Admin", authCookie, jwtCookie)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("expected 200 OK for role in JWT, got %d", resp.StatusCode)
		}
	})

	t.Run("switches to role found directly in cookie", func(t *testing.T) {
		// Cookie has both roles
		cookieSession := &session.Session{
			UserID: "test-user",
			Roles:  []string{"Practitioner", "Clinic Admin"},
			Role:   "Practitioner",
		}
		authCookie := encodeAuthCookie(t, cookieSession)

		resp := mustPostRoleSwitch(t, srv, "Clinic Admin", authCookie)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("expected 200 OK for role in cookie, got %d", resp.StatusCode)
		}
	})

	t.Run("rejects role not in cookie or JWT", func(t *testing.T) {
		// Cookie has only Practitioner role
		cookieSession := &session.Session{
			UserID: "test-user",
			Roles:  []string{"Practitioner"},
			Role:   "Practitioner",
		}
		authCookie := encodeAuthCookie(t, cookieSession)

		// JWT has only Patient role
		jwtCookie := &http.Cookie{
			Name:  "sAccessToken",
			Value: testJWTPatientOnly,
		}

		resp := mustPostRoleSwitch(t, srv, "Clinic Admin", authCookie, jwtCookie)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("expected 400 for role not in cookie or JWT, got %d", resp.StatusCode)
		}
	})

	t.Run("rejects role not in cookie when no JWT cookie present", func(t *testing.T) {
		cookieSession := &session.Session{
			UserID: "test-user",
			Roles:  []string{"Practitioner"},
			Role:   "Practitioner",
		}
		authCookie := encodeAuthCookie(t, cookieSession)

		resp := mustPostRoleSwitch(t, srv, "Clinic Admin", authCookie)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("expected 400 for role not in cookie with no JWT, got %d", resp.StatusCode)
		}
	})
}
