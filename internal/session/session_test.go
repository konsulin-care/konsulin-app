package session

import (
	"context"
	"net/http"
	"net/url"
	"testing"
)

func cookieRaw(t *testing.T, value string) *http.Request {
	t.Helper()
	r := &http.Request{Header: http.Header{}}
	// In production the cookie is URL-encoded by Next.js server action.
	encoded := url.QueryEscape(value)
	r.Header.Set("Cookie", "auth="+encoded)
	return r
}

func TestExtractFromRequest_valid(t *testing.T) {
	cookieVal := `{"userId":"u1","role_name":"Patient","fhirId":"f1","profile_complete":true,"fullname":"Alice","email":"a@b.com"}`
	r := cookieRaw(t, cookieVal)

	s, err := ExtractFromRequest(r, "auth")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.UserID != "u1" {
		t.Errorf("expected UserID u1, got %q", s.UserID)
	}
	if s.Role != "Patient" {
		t.Errorf("expected Role Patient, got %q", s.Role)
	}
	if s.FHIRID != "f1" {
		t.Errorf("expected FHIRID f1, got %q", s.FHIRID)
	}
	if !s.ProfileComplete {
		t.Error("expected ProfileComplete true")
	}
	if s.FullName != "Alice" {
		t.Errorf("expected FullName Alice, got %q", s.FullName)
	}
}

func TestExtractFromRequest_missingCookie(t *testing.T) {
	r := &http.Request{Header: http.Header{}}
	_, err := ExtractFromRequest(r, "auth")
	if err == nil {
		t.Fatal("expected error for missing cookie")
	}
}

func TestExtractFromRequest_emptyCookie(t *testing.T) {
	r := cookieRaw(t, "")
	_, err := ExtractFromRequest(r, "auth")
	if err == nil {
		t.Fatal("expected error for empty cookie")
	}
}

func TestExtractFromRequest_malformedJSON(t *testing.T) {
	r := cookieRaw(t, "not-json")
	_, err := ExtractFromRequest(r, "auth")
	if err == nil {
		t.Fatal("expected error for malformed JSON")
	}
}

func TestExtractFromRequest_missingUserID(t *testing.T) {
	r := cookieRaw(t, `{"role_name":"Patient"}`)
	_, err := ExtractFromRequest(r, "auth")
	if err == nil {
		t.Fatal("expected error for missing userId")
	}
}

func TestExtractFromRequest_emptyRoleDefaultsToGuest(t *testing.T) {
	r := cookieRaw(t, `{"userId":"u1"}`)
	s, err := ExtractFromRequest(r, "auth")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.Role != "Guest" {
		t.Errorf("expected Role Guest, got %q", s.Role)
	}
}

func TestExtractFromRequest_urlEncoded(t *testing.T) {
	// Next.js server action URL-encodes the cookie via encodeURI
	val := `%7B%22userId%22%3A%22u1%22%2C%22role_name%22%3A%22Patient%22%7D`
	r := &http.Request{Header: http.Header{}}
	r.Header.Set("Cookie", "auth="+val)

	s, err := ExtractFromRequest(r, "auth")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.UserID != "u1" {
		t.Errorf("expected UserID u1, got %q", s.UserID)
	}
}

func TestContextRoundTrip(t *testing.T) {
	s := &Session{UserID: "u1", Role: "Patient"}
	ctx := ContextWithSession(context.Background(), s)
	got, ok := SessionFromContext(ctx)
	if !ok {
		t.Fatal("expected session in context")
	}
	if got.UserID != "u1" {
		t.Errorf("expected u1, got %q", got.UserID)
	}
}

func TestContextFromContext_missing(t *testing.T) {
	_, ok := SessionFromContext(context.Background())
	if ok {
		t.Fatal("expected no session in empty context")
	}
}

func TestValidateRedirectPath_valid(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"/profile", "/profile"},
		{"/profile/settings", "/profile/settings"},
		{"/", "/"},
		{"/path?q=1", "/path?q=1"},
		{"/path%20with%20space", "/path with space"},
	}
	for _, tc := range tests {
		got, ok := ValidateRedirectPath(tc.input)
		if !ok {
			t.Errorf("expected valid for %q", tc.input)
			continue
		}
		if got != tc.want {
			t.Errorf("ValidateRedirectPath(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestValidateRedirectPath_invalid(t *testing.T) {
	tests := []string{
		"",
		"   ",
		"https://evil.com",
		"//evil.com",
		"\\path",
		"/" + string(make([]byte, 300)),
	}
	for _, tc := range tests {
		_, ok := ValidateRedirectPath(tc)
		if ok {
			t.Errorf("expected invalid for %q", tc)
		}
	}
}
