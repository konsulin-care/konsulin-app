package handler

import (
	"encoding/json"
	"net/http"
)

type ClientConfigOptions struct {
	AppName     string
	APIURL      string
	APIBasePath string
	AuthPath    string
	AppURL      string
	TXURL       string
}

type clientConfigResponse struct {
	AppName     string `json:"APP_NAME"`
	APIURL      string `json:"API_URL"`
	APIBasePath string `json:"API_BASE_PATH"`
	AuthPath    string `json:"AUTH_PATH"`
	AppURL      string `json:"APP_URL"`
	TXURL       string `json:"TX_URL"`
}

// NewClientConfigHandler returns a handler for GET /api/config.
// Replaces the old Next.js API route that served runtime config to the client.
func NewClientConfigHandler(opts ClientConfigOptions) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Max-Age", "86400")
			w.WriteHeader(http.StatusNoContent)
			return
		}

		resp := clientConfigResponse(opts)

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Cache-Control", "public, max-age=3600, must-revalidate")

		if err := json.NewEncoder(w).Encode(resp); err != nil {
			http.Error(w, `{"error":"Internal Server Error"}`, http.StatusInternalServerError)
		}
	}
}
