package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/konsulin-care/konsulin-app/internal/service"
)

const (
	// maxRecommendations is the number of recommendations returned per request.
	maxRecommendations = 5
	// specialtiesCacheTTL short-caches the distinct specialty list.
	specialtiesCacheTTL = 60 * time.Second
)

// RecommendationsOptions configures the recommendations handler.
type RecommendationsOptions struct {
	BackendBaseURL string
	Client         *http.Client
}

// RecommendationsHandler serves GET /api/recommendations and the specialty list.
type RecommendationsHandler struct {
	svc     *service.RecommendationService
	client  *http.Client
	baseURL string
	cache   specialtiesCache
}

// specialtiesCache is a short-TTL cache for the distinct specialty list.
type specialtiesCache struct {
	at   time.Time
	list []string
}

// NewRecommendationsHandler creates the BFF handler bound to the FHIR backend.
func NewRecommendationsHandler(opts RecommendationsOptions) *RecommendationsHandler {
	client := opts.Client
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	return &RecommendationsHandler{
		svc: service.NewRecommendationService(service.RecommendationOptions{
			BackendBaseURL: opts.BackendBaseURL,
			Client:         client,
		}),
		client:  client,
		baseURL: strings.TrimRight(opts.BackendBaseURL, "/"),
	}
}

// Recommendations handles GET /api/recommendations?specialty=&lat=&lon=.
// It aggregates, enriches with the next free slot, ranks, and samples up to
// five cards.
func (h *RecommendationsHandler) Recommendations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	q := r.URL.Query()
	specialty := strings.TrimSpace(q.Get("specialty"))
	if specialty == "" {
		sendError(w, http.StatusBadRequest, "specialty is required")
		return
	}
	lat, lon, err := parseCoordinates(q.Get("lat"), q.Get("lon"))
	if err != nil {
		sendError(w, http.StatusBadRequest, err.Error())
		return
	}

	recs, err := h.svc.Fetch(r.Context(), service.FetchParams{
		Specialty: specialty,
		Latitude:  lat,
		Longitude: lon,
	})
	if err != nil {
		slog.Error("recommendations: aggregation failed", "err", err)
		sendError(w, http.StatusBadGateway, "failed to fetch recommendations")
		return
	}

	h.enrich(r, recs)
	narrowed := service.NarrowRecommendations(recs, maxRecommendations)

	writeJSON(w, http.StatusOK, map[string]any{
		"specialty":       specialty,
		"recommendations": narrowed,
	})
}

// Specialties handles GET /api/recommendations/specialties returning the
// BFF-derived distinct specialty list (short-cached).
func (h *RecommendationsHandler) Specialties(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if h.cache.valid() {
		writeJSON(w, http.StatusOK, map[string]any{"specialties": h.cache.list})
		return
	}

	list, err := h.svc.DistinctSpecialties(r.Context())
	if err != nil {
		slog.Error("recommendations: specialty list failed", "err", err)
		sendError(w, http.StatusBadGateway, "failed to fetch specialties")
		return
	}
	h.cache = specialtiesCache{at: time.Now(), list: list}
	writeJSON(w, http.StatusOK, map[string]any{"specialties": list})
}

// enrich computes the next free slot for each recommendation card.
func (h *RecommendationsHandler) enrich(r *http.Request, recs []service.Recommendation) {
	now := time.Now()
	for i := range recs {
		slot, err := service.NextFreeSlot(r.Context(), service.NextFreeSlotParams{
			BackendBaseURL:  h.baseURL,
			Client:          h.client,
			ScheduleID:      recs[i].ScheduleID,
			Windows:         recs[i].AvailableTime,
			DurationMinutes: recs[i].DurationMinutes,
			Now:             now,
		})
		if err != nil {
			slog.Warn("recommendations: next slot unavailable",
				"role", recs[i].PractitionerRoleID, "err", err)
			continue
		}
		recs[i].NextSlot = slot
	}
}

// valid reports whether the cached specialty list is still fresh.
func (c specialtiesCache) valid() bool {
	return c.list != nil && time.Since(c.at) < specialtiesCacheTTL
}

// parseCoordinates parses optional lat/lon pairs.
func parseCoordinates(latRaw, lonRaw string) (*float64, *float64, error) {
	if latRaw == "" && lonRaw == "" {
		return nil, nil, nil
	}
	if latRaw == "" || lonRaw == "" {
		return nil, nil, errors.New("both lat and lon are required")
	}
	lat, errLat := strconv.ParseFloat(latRaw, 64)
	lon, errLon := strconv.ParseFloat(lonRaw, 64)
	if errLat != nil || errLon != nil {
		return nil, nil, errors.New("invalid lat or lon")
	}
	return &lat, &lon, nil
}