package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type parentEntry struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Level string `json:"level"`
}

type lookupEntry struct {
	ID      string        `json:"id"`
	Name    string        `json:"name"`
	Level   string        `json:"level"`
	Parents []parentEntry `json:"parents"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("failed to encode JSON response", "err", err)
	}
}
