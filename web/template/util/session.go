// Package util provides templ-helper functions for accessing shared context.
package util

import (
	"context"

	"github.com/konsulin-care/konsulin-app/internal/session"
)

func SessionFromContext(ctx context.Context) *session.Session {
	s, ok := session.SessionFromContext(ctx)
	if !ok {
		return nil
	}
	return s
}
