package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// adminKeyTestServer starts a production-route server and requests its
// /api/admin/key endpoints directly (bypassing the Go HTTP client's cookie jar)
// so the Set-Cookie on the response is inspectable.
func adminKeyTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	return newTestServer(t)
}

// TestAdminKeyRoute_postSetsCookie verifies POST /api/admin/key is reachable
// through the production router, CSRF-exempt, and sets the HttpOnly key cookie.
func TestAdminKeyRoute_postSetsCookie(t *testing.T) {
	server := adminKeyTestServer(t)

	body := strings.NewReader(`{"apiKey":"route-secret-123"}`)
	req, err := http.NewRequest(http.MethodPost, server.URL+"/api/admin/key", body)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusForbidden {
		t.Fatal("POST /api/admin/key must be CSRF-exempt, got 403")
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var gotCookie *http.Cookie
	for _, c := range resp.Cookies() {
		if c.Name == "superadmin_key" {
			gotCookie = c
			break
		}
	}
	if gotCookie == nil {
		t.Fatal("expected Set-Cookie superadmin_key on response")
	}
	if gotCookie.Value != "route-secret-123" {
		t.Errorf("expected cookie value route-secret-123, got %q", gotCookie.Value)
	}
	if !gotCookie.HttpOnly {
		t.Error("superadmin key cookie must be HttpOnly")
	}
}

// TestAdminKeyRoute_deleteClearsCookie verifies DELETE /api/admin/key is
// CSRF-exempt and expires the stored key cookie.
func TestAdminKeyRoute_deleteClearsCookie(t *testing.T) {
	server := adminKeyTestServer(t)

	req, err := http.NewRequest(http.MethodDelete, server.URL+"/api/admin/key", http.NoBody)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusForbidden {
		t.Fatal("DELETE /api/admin/key must be CSRF-exempt, got 403")
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	for _, c := range resp.Cookies() {
		if c.Name == "superadmin_key" && c.MaxAge >= 0 {
			t.Errorf("expected superadmin_key cookie to be expired, got MaxAge=%d", c.MaxAge)
		}
	}
}
