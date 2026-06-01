package util

import (
	"net/http"

	"github.com/gorilla/csrf"
)

// CSRFTokenFromRequest returns the CSRF token for the given request.
// Returns empty string if the CSRF middleware has not been applied.
func CSRFTokenFromRequest(r *http.Request) string {
	return csrf.Token(r)
}
