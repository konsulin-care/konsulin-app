package handler

import (
	"net"
	"net/http"
	"strings"
)

// headerXRealIP is the header Traefik sets to the TCP peer of an inbound
// connection before forwarding it to the BFF.
const headerXRealIP = "X-Real-Ip"

// clientIP resolves the real client address for an inbound request.
//
// The forwarded header is only trusted when the TCP peer is loopback or
// private, which in production means Traefik on the Docker network: Traefik
// deletes client-supplied forwarded headers from untrusted peers and writes
// X-Real-Ip from the socket address itself. Any other peer keeps its own
// address, so a directly reachable BFF cannot be spoofed.
//
// It returns the resolved address, or an empty string when the peer address
// cannot be determined.
func clientIP(r *http.Request) string {
	peer := peerHost(r.RemoteAddr)
	if peer == "" {
		return ""
	}

	addr := net.ParseIP(peer)
	if addr == nil {
		return peer
	}
	if !addr.IsLoopback() && !addr.IsPrivate() {
		return peer
	}

	if forwarded := strings.TrimSpace(r.Header.Get(headerXRealIP)); forwarded != "" {
		if ip := net.ParseIP(forwarded); ip != nil {
			return forwarded
		}
	}
	return peer
}

// peerHost returns the host part of a host:port address, falling back to the
// raw value when it carries no port (and stripping IPv6 brackets either way).
func peerHost(remoteAddr string) string {
	if remoteAddr == "" {
		return ""
	}
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		return strings.Trim(remoteAddr, "[]")
	}
	return host
}

// setClientIPHeaders overwrites the forwarded client headers on an outgoing
// request to the backend. Values are replaced, never appended, so the backend
// sees exactly one client address. Nothing is written when the client cannot
// be resolved.
func setClientIPHeaders(out, in *http.Request) {
	ip := clientIP(in)
	if ip == "" {
		return
	}
	out.Header.Set("X-Forwarded-For", ip)
	out.Header.Set("X-Real-IP", ip)
}
