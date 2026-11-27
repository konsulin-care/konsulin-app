package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestClientIP_resolvesFromTrustedPeer verifies the trust model: X-Real-Ip is
// only honoured when the TCP peer is loopback or private (Traefik on the Docker
// network). A public peer keeps its own address, so a browser cannot spoof it.
func TestClientIP_resolvesFromTrustedPeer(t *testing.T) {
	tests := []struct {
		name       string
		remoteAddr string
		realIP     string
		want       string
	}{
		{
			name:       "loopback peer with IPv4 header",
			remoteAddr: "127.0.0.1:51234",
			realIP:     "203.0.113.7",
			want:       "203.0.113.7",
		},
		{
			name:       "loopback IPv6 peer with IPv6 header",
			remoteAddr: "[::1]:51234",
			realIP:     "2001:db8::1",
			want:       "2001:db8::1",
		},
		{
			name:       "10/8 peer with header",
			remoteAddr: "10.1.2.3:4000",
			realIP:     "203.0.113.7",
			want:       "203.0.113.7",
		},
		{
			name:       "172.16/12 docker peer with header",
			remoteAddr: "172.18.0.5:4000",
			realIP:     "203.0.113.7",
			want:       "203.0.113.7",
		},
		{
			name:       "192.168/16 peer with header",
			remoteAddr: "192.168.1.20:4000",
			realIP:     "203.0.113.7",
			want:       "203.0.113.7",
		},
		{
			name:       "public peer ignores spoofed header",
			remoteAddr: "198.51.100.9:51234",
			realIP:     "203.0.113.7",
			want:       "198.51.100.9",
		},
		{
			name:       "public IPv6 peer ignores spoofed header",
			remoteAddr: "[2001:db8::9]:51234",
			realIP:     "203.0.113.7",
			want:       "2001:db8::9",
		},
		{
			name:       "trusted peer without header",
			remoteAddr: "172.18.0.5:4000",
			want:       "172.18.0.5",
		},
		{
			name:       "trusted peer with unparseable header",
			remoteAddr: "172.18.0.5:4000",
			realIP:     "not-an-ip",
			want:       "172.18.0.5",
		},
		{
			name:       "trusted peer with header carrying a port",
			remoteAddr: "172.18.0.5:4000",
			realIP:     "203.0.113.7:9999",
			want:       "172.18.0.5",
		},
		{
			name:       "IPv6 peer returned without brackets or port",
			remoteAddr: "[::1]:1234",
			want:       "::1",
		},
		{
			name:       "remote addr without port falls back to the raw value",
			remoteAddr: "172.18.0.5",
			want:       "172.18.0.5",
		},
		{
			name:       "empty remote addr yields an empty client",
			remoteAddr: "",
			realIP:     "203.0.113.7",
			want:       "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/proxy/fhir/Patient", http.NoBody)
			req.RemoteAddr = tt.remoteAddr
			if tt.realIP != "" {
				req.Header.Set("X-Real-Ip", tt.realIP)
			}

			if got := clientIP(req); got != tt.want {
				t.Fatalf("clientIP() = %q, want %q", got, tt.want)
			}
		})
	}
}

// TestSetClientIPHeaders_overwrites verifies that the outgoing request carries
// a single resolved client IP and that a browser-supplied chain is replaced
// rather than appended to.
func TestSetClientIPHeaders_overwrites(t *testing.T) {
	in := httptest.NewRequest(http.MethodGet, "/proxy/fhir/Patient", http.NoBody)
	in.RemoteAddr = "172.18.0.5:4000"
	in.Header.Set("X-Real-Ip", "203.0.113.7")
	in.Header.Set("X-Forwarded-For", "1.2.3.4, 5.6.7.8")

	out := httptest.NewRequest(http.MethodGet, "/fhir/Patient", http.NoBody)
	out.Header.Set("X-Forwarded-For", "9.9.9.9")

	setClientIPHeaders(out, in)

	if got := out.Header.Values("X-Forwarded-For"); len(got) != 1 || got[0] != "203.0.113.7" {
		t.Fatalf("X-Forwarded-For = %v, want [203.0.113.7]", got)
	}
	if got := out.Header.Get("X-Real-IP"); got != "203.0.113.7" {
		t.Fatalf("X-Real-IP = %q, want 203.0.113.7", got)
	}
}

// TestSetClientIPHeaders_skipsEmptyClient verifies that no header is written
// when the client IP cannot be resolved.
func TestSetClientIPHeaders_skipsEmptyClient(t *testing.T) {
	in := httptest.NewRequest(http.MethodGet, "/proxy/fhir/Patient", http.NoBody)
	in.RemoteAddr = ""

	out := httptest.NewRequest(http.MethodGet, "/fhir/Patient", http.NoBody)
	setClientIPHeaders(out, in)

	if got := out.Header.Get("X-Forwarded-For"); got != "" {
		t.Fatalf("X-Forwarded-For = %q, want empty", got)
	}
	if got := out.Header.Get("X-Real-IP"); got != "" {
		t.Fatalf("X-Real-IP = %q, want empty", got)
	}
}
