package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newAdminKeyTestServer() *httptest.Server {
	return httptest.NewServer(NewAdminKeyHandler(AdminKeyOptions{
		CookieName:   "superadmin_key",
		CookieSecure: true,
	}))
}

// TestAdminKeyHandler_setCookie verifies POST /api/admin/key stores the
// submitted key in an HttpOnly, Secure, SameSite=Lax cookie so JS can never
// read it, and returns 200 with success=true. Validation is intentionally
// deferred to the backend (lazy enforcement).
func TestAdminKeyHandler_setCookie(t *testing.T) {
	srv := newAdminKeyTestServer()
	defer srv.Close()

	body := strings.NewReader(`{"apiKey":"secret-key-123"}`)
	req, err := http.NewRequest(http.MethodPost, srv.URL+"/api/admin/key", body)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var got map[string]bool
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	if !got["success"] {
		t.Error("expected success=true in response body")
	}

	cookies := resp.Cookies()
	if len(cookies) != 1 {
		t.Fatalf("expected exactly 1 Set-Cookie, got %d", len(cookies))
	}
	c := cookies[0]
	if c.Name != "superadmin_key" {
		t.Errorf("expected cookie name superadmin_key, got %q", c.Name)
	}
	if c.Value != "secret-key-123" {
		t.Errorf("expected cookie value secret-key-123, got %q", c.Value)
	}
	if !c.HttpOnly {
		t.Error("superadmin key cookie must be HttpOnly")
	}
	if !c.Secure {
		t.Error("superadmin key cookie must be Secure when CookieSecure=true")
	}
	if c.SameSite != http.SameSiteLaxMode {
		t.Errorf("expected SameSite=Lax, got %v", c.SameSite)
	}
	if c.Path != "/" {
		t.Errorf("expected Path=/, got %q", c.Path)
	}
}

// TestAdminKeyHandler_clearCookie verifies DELETE /api/admin/key clears the
// stored key cookie (MaxAge < 0) and returns success=true.
func TestAdminKeyHandler_clearCookie(t *testing.T) {
	srv := newAdminKeyTestServer()
	defer srv.Close()

	req, err := http.NewRequest(http.MethodDelete, srv.URL+"/api/admin/key", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	cookies := resp.Cookies()
	if len(cookies) != 1 {
		t.Fatalf("expected exactly 1 Set-Cookie, got %d", len(cookies))
	}
	c := cookies[0]
	if c.Name != "superadmin_key" {
		t.Errorf("expected cookie name superadmin_key, got %q", c.Name)
	}
	if c.MaxAge >= 0 {
		t.Errorf("expected MaxAge < 0 to expire the cookie, got %d", c.MaxAge)
	}
}

// TestAdminKeyHandler_rejectsEmptyKey verifies POST without an apiKey payload
// is rejected with 400 rather than storing an empty cookie.
func TestAdminKeyHandler_rejectsEmptyKey(t *testing.T) {
	srv := newAdminKeyTestServer()
	defer srv.Close()

	body := strings.NewReader(`{}`)
	req, err := http.NewRequest(http.MethodPost, srv.URL+"/api/admin/key", body)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
	if len(resp.Cookies()) != 0 {
		t.Error("no cookie must be set when the key is empty")
	}
}

// TestAdminKeyHandler_rejectsOtherMethods verifies GET (and any method other
// than POST/DELETE) returns 405.
func TestAdminKeyHandler_rejectsOtherMethods(t *testing.T) {
	srv := newAdminKeyTestServer()
	defer srv.Close()

	req, err := http.NewRequest(http.MethodGet, srv.URL+"/api/admin/key", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", resp.StatusCode)
	}
}
