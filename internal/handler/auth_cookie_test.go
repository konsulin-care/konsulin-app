package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/konsulin-care/konsulin-app/internal/session"
)

const cookieTestSecret = "auth-cookie-test-secret"

func init() {
	session.InitSecureCookie(cookieTestSecret)
}

// testJWT is a fixed JWT with payload {"sub":"test-user","exp":9999999999,"st-role":{"v":["Patient"]}}
// used to simulate a valid sAccessToken cookie in tests.
const testJWT = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJleHAiOjk5OTk5OTk5OTksInN0LXJvbGUiOnsidiI6WyJQYXRpZW50Il19fQ.ZmFrZS1zaWc"

// testJWTPractitioner is a fixed JWT with payload {"sub":"test-user","exp":9999999999,"st-role":{"v":["Patient","Practitioner"]}}
const testJWTPractitioner = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJleHAiOjk5OTk5OTk5OTksInN0LXJvbGUiOnsidiI6WyJQYXRpZW50IiwiUHJhY3RpdGlvbmVyIl19fQ.ZmFrZS1zaWc"

func newAuthCookieServer(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/auth/cookie", NewAuthCookieHandler(AuthCookieOptions{
		CookieName:   "auth",
		CookieSecure: false,
		CookieSecret: cookieTestSecret,
	}))
	return httptest.NewServer(mux)
}

func mustPost(t *testing.T, srv *httptest.Server, path, body string, cookies ...*http.Cookie) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodPost, srv.URL+path, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
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
func mustDelete(t *testing.T, srv *httptest.Server, path string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodDelete, srv.URL+path, http.NoBody)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { resp.Body.Close() })
	return resp
}
func findCookie(resp *http.Response, name string) *http.Cookie {
	for _, c := range resp.Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

func extractSessionFromCookie(t *testing.T, cookie *http.Cookie) *session.Session {
	t.Helper()
	r := &http.Request{Header: http.Header{}}
	r.Header.Set("Cookie", cookie.String())
	s, err := session.ExtractFromRequest(r, "auth", cookieTestSecret)
	if err != nil {
		t.Fatalf("ExtractFromRequest: %v", err)
	}
	return s
}
func TestPostAuthCookie_setsCookie(t *testing.T) {
	srv := newAuthCookieServer(t)
	t.Cleanup(srv.Close)
	body := `{"userId":"u1","role_name":"Patient","fhirId":"f1","profile_complete":true,"fullname":"Alice","email":"a@b.com"}`
	resp := mustPost(t, srv, "/auth/cookie", body, &http.Cookie{
		Name:  "sAccessToken",
		Value: testJWT,
	})
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	authCookie := findCookie(resp, "auth")
	if authCookie == nil {
		t.Fatal("expected auth cookie")
	}
	sess := extractSessionFromCookie(t, authCookie)
	if sess.UserID != "test-user" {
		t.Errorf("expected UserID test-user (verified), got %q", sess.UserID)
	}
	if len(sess.Roles) != 1 || sess.Roles[0] != "Patient" {
		t.Errorf("expected Roles [Patient] (from JWT), got %v", sess.Roles)
	}
	if sess.Role != "Patient" {
		t.Errorf("expected Role Patient (from JWT), got %q", sess.Role)
	}
	if sess.FHIRID != "f1" {
		t.Errorf("expected FHIRID f1, got %q", sess.FHIRID)
	}
	if !sess.ProfileComplete {
		t.Error("expected ProfileComplete true")
	}
	if sess.FullName != "Alice" {
		t.Errorf("expected FullName Alice, got %q", sess.FullName)
	}
	if sess.Email != "a@b.com" {
		t.Errorf("expected Email a@b.com, got %q", sess.Email)
	}
}

func TestPostAuthCookie_missingUserId(t *testing.T) {
	srv := newAuthCookieServer(t)
	t.Cleanup(srv.Close)
	body := `{"role_name":"Patient"}`
	resp := mustPost(t, srv, "/auth/cookie", body, &http.Cookie{
		Name:  "sAccessToken",
		Value: testJWT,
	})
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestPostAuthCookie_missingSAccessToken(t *testing.T) {
	srv := newAuthCookieServer(t)
	t.Cleanup(srv.Close)
	body := `{"userId":"u1","role_name":"Patient"}`
	resp := mustPost(t, srv, "/auth/cookie", body)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}
func TestPostAuthCookie_rolePrecedence(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name      string
		body      string
		wantRoles []string
		wantRole  string
	}{
		{
			name:      "client roles take precedence over JWT",
			body:      `{"userId":"u1","role_name":"Practitioner","roles":["Practitioner"],"fhirId":"f1"}`,
			wantRoles: []string{"Practitioner"},
			wantRole:  "Practitioner",
		},
		{
			name:      "empty roles falls back to JWT st-role",
			body:      `{"userId":"u1","role_name":"","fhirId":"f1"}`,
			wantRoles: []string{"Patient"},
			wantRole:  "Patient",
		},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			srv := newAuthCookieServer(t)
			t.Cleanup(srv.Close)
			resp := mustPost(t, srv, "/auth/cookie", tc.body, &http.Cookie{
				Name:  "sAccessToken",
				Value: testJWT,
			})
			if resp.StatusCode != http.StatusOK {
				t.Errorf("expected 200, got %d", resp.StatusCode)
			}
			authCookie := findCookie(resp, "auth")
			if authCookie == nil {
				t.Fatal("expected auth cookie")
			}
			sess := extractSessionFromCookie(t, authCookie)
			if len(sess.Roles) != len(tc.wantRoles) || sess.Roles[0] != tc.wantRoles[0] {
				t.Errorf("expected Roles %v, got %v", tc.wantRoles, sess.Roles)
			}
			if sess.Role != tc.wantRole {
				t.Errorf("expected Role %q, got %q", tc.wantRole, sess.Role)
			}
		})
	}
}
func TestDeleteAuthCookie_clearsCookies(t *testing.T) {
	tests := []struct {
		name       string
		cookieName string
	}{
		{name: "auth", cookieName: "auth"},
		{name: "st-last-access-token-update", cookieName: "st-last-access-token-update"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			srv := newAuthCookieServer(t)
			t.Cleanup(srv.Close)
			resp := mustDelete(t, srv, "/auth/cookie")
			if resp.StatusCode != http.StatusOK {
				t.Errorf("expected 200, got %d", resp.StatusCode)
			}
			c := findCookie(resp, tc.cookieName)
			if c == nil {
				t.Fatalf("expected %s cookie in response", tc.cookieName)
				return
			}
			if c.Value != "" {
				t.Errorf("expected empty cookie value, got %q", c.Value)
			}
			if c.MaxAge != -1 {
				t.Errorf("expected MaxAge -1, got %d", c.MaxAge)
			}
		})
	}
}
func TestPostAuthCookie_withAllFields(t *testing.T) {
	srv := newAuthCookieServer(t)
	t.Cleanup(srv.Close)
	body := `{"userId":"u2","role_name":"Practitioner","roles":["Patient","Practitioner"],"fhirId":"f2","profile_complete":false,"fullname":"Bob","email":"b@c.com","phoneNumber":"+62812345678","profile_picture":"https://example.com/pic.jpg"}`
	resp := mustPost(t, srv, "/auth/cookie", body, &http.Cookie{
		Name:  "sAccessToken",
		Value: testJWTPractitioner,
	})
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	authCookie := findCookie(resp, "auth")
	if authCookie == nil {
		t.Fatal("expected auth cookie")
	}
	sess := extractSessionFromCookie(t, authCookie)
	if sess.UserID != "test-user" {
		t.Errorf("expected UserID test-user (verified), got %q", sess.UserID)
	}
	// Role/Roles from JWT st-role, not request body.
	if sess.Role != "Practitioner" {
		t.Errorf("expected Role Practitioner (from JWT), got %q", sess.Role)
	}
	if len(sess.Roles) != 2 || sess.Roles[0] != "Patient" || sess.Roles[1] != "Practitioner" {
		t.Errorf("expected Roles [Patient Practitioner] (from JWT), got %v", sess.Roles)
	}
	if sess.FHIRID != "f2" {
		t.Errorf("expected FHIRID f2, got %q", sess.FHIRID)
	}
	if sess.ProfileComplete {
		t.Error("expected ProfileComplete false")
	}
	if sess.FullName != "Bob" {
		t.Errorf("expected FullName Bob, got %q", sess.FullName)
	}
	if sess.Email != "b@c.com" {
		t.Errorf("expected Email b@c.com, got %q", sess.Email)
	}
	if sess.PhoneNumber != "+62812345678" {
		t.Errorf("expected PhoneNumber +62812345678, got %q", sess.PhoneNumber)
	}
	if sess.ProfilePicture != "https://example.com/pic.jpg" {
		t.Errorf("expected ProfilePicture https://example.com/pic.jpg, got %q", sess.ProfilePicture)
	}
}
func TestAuthCookieHandler_wrongMethod(t *testing.T) {
	srv := newAuthCookieServer(t)
	t.Cleanup(srv.Close)
	req, err := http.NewRequest(http.MethodPatch, srv.URL+"/auth/cookie", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", resp.StatusCode)
	}
}
func TestPostAuthCookie_invalidJSON(t *testing.T) {
	srv := newAuthCookieServer(t)
	t.Cleanup(srv.Close)
	resp := mustPost(t, srv, "/auth/cookie", "not-json", &http.Cookie{
		Name:  "sAccessToken",
		Value: testJWT,
	})
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}
