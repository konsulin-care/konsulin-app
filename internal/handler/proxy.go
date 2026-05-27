// Package handler contains HTTP handlers that delegate to the service layer.
package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
)

func NewReverseProxy(target *url.URL) *httputil.ReverseProxy {
	return &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(target)
			pr.Out.Host = target.Host
			pr.Out.Header.Set("X-Forwarded-Host", pr.Out.Host)
			pr.Out.Header.Set("X-Forwarded-Proto", "http")
			if orig := pr.Out.Header.Get("X-Forwarded-For"); orig != "" {
				pr.Out.Header.Set("X-Forwarded-For", orig+", "+pr.Out.RemoteAddr)
			} else {
				pr.Out.Header.Set("X-Forwarded-For", pr.Out.RemoteAddr)
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
