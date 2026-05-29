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

func newAuthCookieServer() *httptest.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/auth/cookie", NewAuthCookieHandler(AuthCookieOptions{
		CookieName:   "auth",
		CookieSecure: false,
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
	srv := newAuthCookieServer()
	t.Cleanup(srv.Close)

	body := `{"userId":"u1","role_name":"Patient","fhirId":"f1","profile_complete":true,"fullname":"Alice","email":"a@b.com"}`
	resp := mustPost(t, srv, "/auth/cookie", body, &http.Cookie{
		Name:  "sAccessToken",
		Value: "test-token-123",
	})

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	authCookie := findCookie(resp, "auth")
	if authCookie == nil {
		t.Fatal("expected auth cookie")
	}
	if authCookie.Value == "" {
		t.Fatal("expected non-empty cookie value")
	}
	if !authCookie.HttpOnly {
		t.Error("expected HttpOnly=true")
	}
	if authCookie.SameSite != http.SameSiteLaxMode {
		t.Errorf("expected SameSite=Lax, got %v", authCookie.SameSite)
	}

	sess := extractSessionFromCookie(t, authCookie)
	if sess.UserID != "u1" {
		t.Errorf("expected UserID u1, got %q", sess.UserID)
	}
	if sess.Role != "Patient" {
		t.Errorf("expected Role Patient, got %q", sess.Role)
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
	srv := newAuthCookieServer()
	t.Cleanup(srv.Close)

	body := `{"role_name":"Patient"}`
	resp := mustPost(t, srv, "/auth/cookie", body, &http.Cookie{
		Name:  "sAccessToken",
		Value: "test-token",
	})

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestPostAuthCookie_missingSAccessToken(t *testing.T) {
	srv := newAuthCookieServer()
	t.Cleanup(srv.Close)

	body := `{"userId":"u1","role_name":"Patient"}`
	resp := mustPost(t, srv, "/auth/cookie", body)

	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}

func TestDeleteAuthCookie_clearsCookie(t *testing.T) {
	srv := newAuthCookieServer()
	t.Cleanup(srv.Close)

	resp := mustDelete(t, srv, "/auth/cookie")

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	authCookie := findCookie(resp, "auth")
	if authCookie == nil {
		t.Fatal("expected auth cookie in response")
	}
	if authCookie.Value != "" {
		t.Errorf("expected empty cookie value, got %q", authCookie.Value)
	}
	if authCookie.MaxAge != -1 {
		t.Errorf("expected MaxAge -1, got %d", authCookie.MaxAge)
	}
	if !authCookie.HttpOnly {
		t.Error("expected HttpOnly=true")
	}
	if authCookie.SameSite != http.SameSiteLaxMode {
		t.Errorf("expected SameSite=Lax, got %v", authCookie.SameSite)
	}
}

func TestPostAuthCookie_withAllFields(t *testing.T) {
	srv := newAuthCookieServer()
	t.Cleanup(srv.Close)

	body := `{
		"userId":"u2",
		"role_name":"Practitioner",
		"roles":["Patient","Practitioner"],
		"fhirId":"f2",
		"profile_complete":false,
		"fullname":"Bob",
		"email":"b@c.com",
		"phoneNumber":"+62812345678",
		"profile_picture":"https://example.com/pic.jpg"
	}`
	resp := mustPost(t, srv, "/auth/cookie", body, &http.Cookie{
		Name:  "sAccessToken",
		Value: "token-456",
	})

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	authCookie := findCookie(resp, "auth")
	if authCookie == nil {
		t.Fatal("expected auth cookie")
	}

	sess := extractSessionFromCookie(t, authCookie)
	if sess.UserID != "u2" {
		t.Errorf("expected UserID u2, got %q", sess.UserID)
	}
	if sess.Role != "Practitioner" {
		t.Errorf("expected Role Practitioner, got %q", sess.Role)
	}
	if len(sess.Roles) != 2 || sess.Roles[0] != "Patient" || sess.Roles[1] != "Practitioner" {
		t.Errorf("expected Roles [Patient Practitioner], got %v", sess.Roles)
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
	srv := newAuthCookieServer()
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
	srv := newAuthCookieServer()
	t.Cleanup(srv.Close)

	resp := mustPost(t, srv, "/auth/cookie", "not-json", &http.Cookie{
		Name:  "sAccessToken",
		Value: "token",
	})

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}
