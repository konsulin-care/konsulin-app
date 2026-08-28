package main

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/konsulin-care/konsulin-app/internal/config"
	"github.com/konsulin-care/konsulin-app/internal/data/wilayah"
	"github.com/konsulin-care/konsulin-app/internal/handler"
	appmw "github.com/konsulin-care/konsulin-app/internal/middleware"
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
	// Backend API proxy — adds Bearer token from SuperTokens cookie.
	r.Handle("/proxy/*", handler.NewBackendProxyHandler(handler.BackendProxyOptions{
		BackendBaseURL:          cfg.APIURL,
		AccessCookieName:        cfg.SessionCookieNameAccess,
		SuperadminKeyCookieName: cfg.SuperadminKeyCookieName,
	}))

	// Questionnaire create — new assessments must enter the catalog as drafts.
	// Exact-path match wins over the /proxy/* catch-all above.
	r.Post("/proxy/fhir/Questionnaire", handler.NewQuestionnaireCreateHandler(handler.QuestionnaireCreateOptions{
		BackendBaseURL:          cfg.APIURL,
		AccessCookieName:        cfg.SessionCookieNameAccess,
		SuperadminKeyCookieName: cfg.SuperadminKeyCookieName,
	}))

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
