package handler

import (
	"log/slog"
	"net/http"

	"github.com/a-h/templ"
	"github.com/konsulin-care/konsulin-app/internal/config"
	"github.com/konsulin-care/konsulin-app/internal/service"
	"github.com/konsulin-care/konsulin-app/internal/session"
	"github.com/konsulin-care/konsulin-app/web/template/layout"
	homeTmpl "github.com/konsulin-care/konsulin-app/web/template/pages/home"
	"github.com/konsulin-care/konsulin-app/web/template/partials"
	"github.com/konsulin-care/konsulin-app/web/template/util"
)

func NewHomeHandler(cfg *config.Config, svc *service.HomeService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sess, ok := session.SessionFromContext(r.Context())
		if !ok || sess == nil {
			slog.Warn("home: no session in context, redirecting to auth")
			http.Redirect(w, r, cfg.AuthPath, http.StatusFound)
			return
		}

		data, err := svc.FetchHomeData(r.Context(), sess.Role, sess.FHIRID, displayNameFromSession(sess))
		if err != nil {
			slog.Error("home: fetch data failed", "role", sess.Role, "err", err)
		}

		roleSwitcher := roleSwitcherFor(sess)
		if err := layout.Base(cfg, "/", homeTmpl.Header(data), contentForRole(sess.Role, data), sess.GuestID, util.CSRFTokenFromRequest(r), roleSwitcher).Render(r.Context(), w); err != nil {
			slog.Error("home: render failed", "err", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
	}
}

func displayNameFromSession(sess *session.Session) string {
	if sess.FullName != "" && sess.FullName != "-" {
		return sess.FullName
	}
	if sess.Email != "" {
		return sess.Email
	}
	return "Guest"
}

func contentForRole(role string, data *service.HomeData) templ.Component {
	switch role {
	case "Practitioner":
		return homeTmpl.PractitionerPage(data)
	case "Clinic Admin":
		return homeTmpl.AdminPage(data)
	default:
		return homeTmpl.PatientGuestPage(data)
	}
}

func roleSwitcherFor(sess *session.Session) templ.Component {
	if len(sess.Roles) > 1 {
		return partials.RoleSwitcher(sess.Role, sess.Roles)
	}
	return nil
}
