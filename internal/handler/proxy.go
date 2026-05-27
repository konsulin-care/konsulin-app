// Package handler contains HTTP handlers that delegate to the service layer.
package handler

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"
)

const xForwardedFor = "X-Forwarded-For"

func NewReverseProxy(target *url.URL) *httputil.ReverseProxy {
	return &httputil.ReverseProxy{
		Transport: &http.Transport{
			DialContext: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout:   10 * time.Second,
			ResponseHeaderTimeout: 15 * time.Second,
			IdleConnTimeout:       30 * time.Second,
			MaxIdleConns:          100,
		},
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(target)
			pr.Out.Host = target.Host
			pr.Out.Header.Set("X-Forwarded-Host", pr.In.Host)
			proto := "http"
			if pr.In.TLS != nil {
				proto = "https"
			} else if fwd := pr.In.Header.Get("X-Forwarded-Proto"); fwd != "" {
				proto = fwd
			}
			pr.Out.Header.Set("X-Forwarded-Proto", proto)
			if orig := pr.Out.Header.Get(xForwardedFor); orig != "" {
				pr.Out.Header.Set(xForwardedFor, orig+", "+pr.Out.RemoteAddr)
			} else {
				pr.Out.Header.Set(xForwardedFor, pr.Out.RemoteAddr)
			}
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			slog.Error("proxy error", "path", r.URL.Path, "err", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			if encodeErr := json.NewEncoder(w).Encode(map[string]string{"error": "upstream unavailable"}); encodeErr != nil {
				slog.Error("failed to encode proxy error response", "err", encodeErr)
			}
		},
	}
}
