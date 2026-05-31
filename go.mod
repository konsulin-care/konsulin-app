module github.com/konsulin-care/konsulin-app

go 1.26.3

require (
	github.com/a-h/templ v0.3.1020
	github.com/go-chi/chi/v5 v5.3.0
	// CVE-2025-47909 (TrustedOrigins bypass): Not exploitable — TrustedOrigins not used anywhere. No fix available.
	github.com/gorilla/csrf v1.7.3
	github.com/gorilla/securecookie v1.1.2
)
