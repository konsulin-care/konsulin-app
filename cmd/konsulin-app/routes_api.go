package main

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/konsulin-care/konsulin-app/internal/config"
	"github.com/konsulin-care/konsulin-app/internal/data/wilayah"
	"github.com/konsulin-care/konsulin-app/internal/handler"
	appmw "github.com/konsulin-care/konsulin-app/internal/middleware"
	"github.com/konsulin-care/konsulin-app/internal/proxycache"
)

// registerAPIRoutes sets up API endpoints (config, admin, relay, etc.).
func registerAPIRoutes(r chi.Router, cfg *config.Config) {
	r.Get("/api/config", handler.NewClientConfigHandler(handler.ClientConfigOptions{
		AppName:     cfg.AppName,
		APIURL:      cfg.APIURL,
		APIBasePath: cfg.APIBasePath,
		AuthPath:    cfg.AuthPath,
		AppURL:      cfg.AppURL,
		TXURL:       cfg.TXURL,

		KonsulinOrganizationID: cfg.KonsulinOrganizationID,
	}))

	// Superadmin key custody — BFF stores the submitted key in an HttpOnly
	// cookie; the backend validates it on each request (lazy enforcement).
	r.Post("/api/admin/key", handler.NewAdminKeyHandler(handler.AdminKeyOptions{
		CookieName:   cfg.SuperadminKeyCookieName,
		CookieSecure: cfg.CookieSecure,
	}))
	r.Delete("/api/admin/key", handler.NewAdminKeyHandler(handler.AdminKeyOptions{
		CookieName:   cfg.SuperadminKeyCookieName,
		CookieSecure: cfg.CookieSecure,
	}))

	// Wilayah region data — serve from pre-built index, skip proxy.
	wh := handler.NewWilayahHandler(&wilayah.WilayahData)
	r.Get("/api/provinces", wh.Provinces)
	r.Get("/api/provinces/search", wh.ProvinceSearch)
	r.Get("/api/regencies/{provinceId}", wh.Regencies)
	r.Get("/api/regencies/search", wh.RegencySearch)
	r.Get("/api/districts/{regencyId}", wh.Districts)
	r.Get("/api/villages/{districtId}", wh.Villages)
	r.Get("/api/lookup/{id}", wh.Lookup)

	// Relay routes — BFF handles FHIR orchestration, not proxied.
	r.Post("/api/v1/relay/booking", handler.NewRelayBookingHandler(handler.RelayBookingOptions{
		BackendBaseURL:   cfg.APIURL,
		AccessCookieName: cfg.SessionCookieNameAccess,
	}))

	// Recommendation engine — BFF aggregation served as pre-joined JSON.
	recHandler := handler.NewRecommendationsHandler(handler.RecommendationsOptions{
		BackendBaseURL: cfg.APIURL,
	})
	r.Get("/api/recommendations", recHandler.Recommendations)
	r.Get("/api/recommendations/specialties", recHandler.Specialties)
}

// registerProxyRoutes sets up backend proxy and SuperTokens auth routes.
func registerProxyRoutes(r chi.Router, cfg *config.Config) {
	// Shared cache for public catalog GETs. Only the /proxy/* route uses it;
	// the auth route keeps a nil cache.
	cache := proxycache.New(proxycache.Options{
		TTL:           24 * time.Hour,
		MaxEntries:    2000,
		MaxEntryBytes: 1 << 20,
		MaxTotalBytes: 64 << 20,
	})

	// Backend API proxy — adds Bearer token from SuperTokens cookie.
	r.Handle("/proxy/*", handler.NewBackendProxyHandler(handler.BackendProxyOptions{
		BackendBaseURL:          cfg.APIURL,
		AccessCookieName:        cfg.SessionCookieNameAccess,
		SuperadminKeyCookieName: cfg.SuperadminKeyCookieName,
		Cache:                   cache,
	}))

	// Questionnaire create — new assessments must enter the catalog as drafts.
	// Exact-path match wins over the /proxy/* catch-all above.
	questionnaireCreate := handler.NewQuestionnaireCreateHandler(handler.QuestionnaireCreateOptions{
		BackendBaseURL:          cfg.APIURL,
		AccessCookieName:        cfg.SessionCookieNameAccess,
		SuperadminKeyCookieName: cfg.SuperadminKeyCookieName,
	})
	r.Post("/proxy/fhir/Questionnaire", invalidateOnSuccess(cache, "Questionnaire", questionnaireCreate))

	// SuperTokens API proxy — converts backend response headers to Set-Cookie.
	r.Handle("/api/v1/auth/*", handler.NewBackendProxyHandler(handler.BackendProxyOptions{
		BackendBaseURL: cfg.APIURL,
		CookieMappings: []handler.HeaderCookieMapping{
			{HeaderName: "st-access-token", CookieName: "sAccessToken", HTTPOnly: true},
			{HeaderName: "st-refresh-token", CookieName: "sRefreshToken", HTTPOnly: true},
			{HeaderName: "front-token", CookieName: "sFrontToken", HTTPOnly: false},
		},
		CookieSecure:            cfg.CookieSecure,
		SuperadminKeyCookieName: cfg.SuperadminKeyCookieName,
	}))
}

// registerMediaUpload sets up media upload route with admin guard.
func registerMediaUpload(r chi.Router, cfg *config.Config, authGuard func(http.Handler) http.Handler) {
	adminGuard := appmw.RequireRole(appmw.RequireRoleOptions{
		RedirectIntentCookieName: cfg.RedirectIntentCookieName,
		AuthPath:                 cfg.AuthPath,
		UnauthorizedPath:         "/unauthorized",
		CookieSecure:             cfg.CookieSecure,
		AppURL:                   cfg.AppURL,
	}, "Clinic Admin")
	r.With(authGuard, adminGuard).Post("/api/media/location", handler.NewUploadHandler(handler.UploadOptions{
		CloudinaryCloudName:    cfg.CloudinaryCloudName,
		CloudinaryUploadPreset: cfg.CloudinaryUploadPreset,
	}))
}

// statusRecorder captures the response status code written by a handler.
type statusRecorder struct {
	http.ResponseWriter

	status int
}

// WriteHeader records the status code before delegating to the wrapped writer.
func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// invalidateOnSuccess wraps next and invalidates resourceType in cache when the
// upstream responds with a 2xx status.
func invalidateOnSuccess(cache *proxycache.Cache, resourceType string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		recorder := &statusRecorder{ResponseWriter: w}
		next(recorder, r)
		if recorder.status >= http.StatusOK && recorder.status < http.StatusMultipleChoices {
			cache.InvalidateType(resourceType)
		}
	}
}
