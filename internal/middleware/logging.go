// Package middleware provides HTTP middleware for the application.
package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

func NewLogger(logger *slog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			next.ServeHTTP(ww, r)

			attrs := []slog.Attr{
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.String("remote", r.RemoteAddr),
				slog.Int("status", ww.Status()),
				slog.Duration("duration", time.Since(start)),
			}
			if reqIDRaw := r.Context().Value(middleware.RequestIDKey); reqIDRaw != nil {
				if reqID, ok := reqIDRaw.(string); ok {
					attrs = append(attrs, slog.String("request_id", reqID))
				}
			}
			logger.LogAttrs(r.Context(), slog.LevelInfo, "request", attrs...)
		})
	}
}
