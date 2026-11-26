package handler

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/konsulin-care/konsulin-app/internal/proxycache"
)

// maxCapturedBodyBytes is the largest /fhir POST body buffered to decide whether
// the Bundle only performs reads. Larger bodies are streamed unchanged and
// treated as writes, so a hostile payload cannot exhaust proxy memory.
const maxCapturedBodyBytes = 8 << 20

// detectReadOnlyBatch inspects a POST /fhir body to decide whether it is a
// read-only FHIR batch Bundle. It always restores the body so the upstream
// request still receives the full original payload.
func detectReadOnlyBatch(r *http.Request, backendPath string) (*http.Request, bool) {
	if !isRootBatchPost(r.Method, backendPath) || r.Body == nil || r.Body == http.NoBody {
		return r, false
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, maxCapturedBodyBytes+1))
	_ = r.Body.Close()
	r.Body = io.NopCloser(bytes.NewReader(body))
	if err != nil {
		slog.Warn("backend proxy: failed to read batch body", "err", err)
		return r, false
	}
	if len(body) > maxCapturedBodyBytes {
		slog.Warn("backend proxy: batch body too large to inspect", "bytes", len(body))
		return r, false
	}
	return r, proxycache.IsReadOnlyBatch(body)
}

// isRootBatchPost reports whether the request is a POST to the /fhir root,
// which is the only path that carries a Bundle transaction or batch.
func isRootBatchPost(method, backendPath string) bool {
	if !strings.EqualFold(method, http.MethodPost) {
		return false
	}
	return strings.TrimSuffix(backendPath, "/") == "/fhir"
}

// cacheInvalidationType reports which cached resource type a successful write
// must invalidate. A read-only batch POST on /fhir only reads, so it never
// clears the cache even though InvalidationType classifies it as a "*" write.
func cacheInvalidationType(method, backendPath string, status int, readOnlyBatch bool) (string, bool) {
	if status < http.StatusOK || status >= http.StatusMultipleChoices {
		return "", false
	}
	resourceType, ok := proxycache.InvalidationType(method, backendPath)
	if !ok {
		return "", false
	}
	if resourceType == "*" && readOnlyBatch {
		return "", false
	}
	return resourceType, true
}
