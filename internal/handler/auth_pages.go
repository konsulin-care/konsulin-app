package handler

import (
	"log/slog"
	"net/http"

	"github.com/konsulin-care/konsulin-app/internal/config"
	"github.com/konsulin-care/konsulin-app/web/template/pages/auth"
)

func NewAuthPageHandler(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := auth.AuthShell(cfg).Render(r.Context(), w); err != nil {
			slog.Error("auth page render failed", "err", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
	}
}
