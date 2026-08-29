package session

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"testing"
	"time"
)

const testSecret = "test-secret-key-for-testing"

func signedCookie(t *testing.T, value string) *http.Request {
	t.Helper()
	r := &http.Request{Header: http.Header{}}
	signed := signValue(value, testSecret)
	encoded := url.QueryEscape(signed)
	r.Header.Set("Cookie", "auth="+encoded)
	return r
}

func TestExtractFromRequest_valid(t *testing.T) {
	cookieVal := `{"userId":"u1","role_name":"Patient","fhirId":"f1","profile_complete":true,"fullname":"Alice","email":"a@b.com"}`
	r := signedCookie(t, cookieVal)

	s, err := ExtractFromRequest(r, "auth", testSecret)
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
	_, err := ExtractFromRequest(r, "auth", testSecret)
	if err == nil {
		t.Fatal("expected error for missing cookie")
	}
}

func TestExtractFromRequest_emptyCookie(t *testing.T) {
	r := signedCookie(t, "")
	_, err := ExtractFromRequest(r, "auth", testSecret)
	if err == nil {
		t.Fatal("expected error for empty cookie")
	}
}

func TestExtractFromRequest_expiredCookie(t *testing.T) {
	// Cookie with past Exp — should return error.
	payload := `{"userId":"u1","role_name":"Patient","exp":1000000000}`
	r := signedCookie(t, payload)
	_, err := ExtractFromRequest(r, "auth", testSecret)
	if err == nil {
		t.Fatal("expected error for expired cookie")
	}
}

func TestExtractFromRequest_validExp(t *testing.T) {
	// Cookie with future Exp — should succeed.
	future := time.Now().Add(1 * time.Hour).Unix()
	payload := fmt.Sprintf(`{"userId":"u1","role_name":"Patient","exp":%d}`, future)
	r := signedCookie(t, payload)
	s, err := ExtractFromRequest(r, "auth", testSecret)
	if err != nil {
		t.Fatalf("unexpected error for valid exp cookie: %v", err)
	}
	if s.UserID != "u1" {
		t.Errorf("expected UserID u1, got %q", s.UserID)
	}
}

func TestExtractFromRequest_noExp(t *testing.T) {
	// Cookie without Exp field — should be accepted (backward compat).
	payload := `{"userId":"u1","role_name":"Patient"}`
	r := signedCookie(t, payload)
	s, err := ExtractFromRequest(r, "auth", testSecret)
	if err != nil {
		t.Fatalf("unexpected error for no-exp cookie: %v", err)
	}
	if s.UserID != "u1" {
		t.Errorf("expected UserID u1, got %q", s.UserID)
	}
}

func TestExtractFromRequest_unsignedCookie(t *testing.T) {
	// Unsigned JSON is rejected when AllowUnsigned is false (default).
	r := &http.Request{Header: http.Header{}}
	r.Header.Set("Cookie", "auth="+url.QueryEscape(`{"userId":"u1","role_name":"Admin"}`))
	_, err := ExtractFromRequest(r, "auth", testSecret)
	if err == nil {
		t.Fatal("expected error for unsigned cookie")
	}
}

func TestExtractFromRequest_tamperedSignature(t *testing.T) {
	validJSON := `{"userId":"u2","role_name":"Patient"}`
	r := signedCookie(t, validJSON)
	signed := r.Header.Get("Cookie") // "auth=<signed>"

	// Tamper the first byte of the signed value
	tampered := signed[:len(signed)-3] + "XXX"
	r2 := &http.Request{Header: http.Header{}}
	r2.Header.Set("Cookie", tampered)
	_, err := ExtractFromRequest(r2, "auth", testSecret)
	if err == nil {
		t.Fatal("expected error for tampered signature")
	}
}

func TestExtractFromRequest_malformedJSON(t *testing.T) {
	r := signedCookie(t, "not-json")
	_, err := ExtractFromRequest(r, "auth", testSecret)
	if err == nil {
		t.Fatal("expected error for malformed JSON")
	}
}

func TestExtractFromRequest_missingUserID(t *testing.T) {
	r := signedCookie(t, `{"role_name":"Patient"}`)
	_, err := ExtractFromRequest(r, "auth", testSecret)
	if err == nil {
		t.Fatal("expected error for missing userId")
	}
}

func TestExtractFromRequest_emptyRoleDefaultsToGuest(t *testing.T) {
	r := signedCookie(t, `{"userId":"u1"}`)
	s, err := ExtractFromRequest(r, "auth", testSecret)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.Role != "Guest" {
		t.Errorf("expected Role Guest, got %q", s.Role)
	}
}

func TestExtractFromRequest_urlEncoded(t *testing.T) {
	payload := `{"userId":"u1","role_name":"Patient"}`
	signed := signValue(payload, testSecret)
	val := url.QueryEscape(signed)
	r := &http.Request{Header: http.Header{}}
	r.Header.Set("Cookie", "auth="+val)

	s, err := ExtractFromRequest(r, "auth", testSecret)
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

const testBaseURL = "http://localhost:3000"

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
		got, ok := ValidateRedirectPath(tc.input, testBaseURL)
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
		_, ok := ValidateRedirectPath(tc, testBaseURL)
		if ok {
			t.Errorf("expected invalid for %q", tc)
		}
	}
}

func TestValidateRedirectPath_crossOrigin(t *testing.T) {
	tests := []string{
		"http://evil.com",
		"https://evil.com/path",
		"//evil.com/hello",
	}
	for _, tc := range tests {
		_, ok := ValidateRedirectPath(tc, testBaseURL)
		if ok {
			t.Errorf("expected cross-origin rejected for %q", tc)
		}
	}
}

func TestValidateRedirectPath_invalidBaseURL(t *testing.T) {
	_, ok := ValidateRedirectPath("/valid", ":not-a-url")
	if ok {
		t.Error("expected false for invalid base URL")
	}
}

func TestValidateRedirectPath_wrongSecret(t *testing.T) {
	// Verify that different secret rejects the cookie
	payload := `{"userId":"u1","role_name":"Patient"}`
	signed := signValue(payload, testSecret)
	r := &http.Request{Header: http.Header{}}
	r.Header.Set("Cookie", "auth="+url.QueryEscape(signed))
	_, err := ExtractFromRequest(r, "auth", "different-secret")
	if err == nil {
		t.Fatal("expected error for wrong secret")
	}
}
