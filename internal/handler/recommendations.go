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
	maxRecommendations = 4
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

// Recommendations handles GET /api/recommendations?specialty=&icfDomain=&lat=&lon=.
// It aggregates, enriches with the next free slot, ranks, and returns up to
// four cards. specialty is optional; when absent it derives from icfDomain.
func (h *RecommendationsHandler) Recommendations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	q := r.URL.Query()
	specialty := strings.TrimSpace(q.Get("specialty"))
	icfDomain := strings.TrimSpace(q.Get("icfDomain"))
	if specialty == "" {
		if icfDomain == "" {
			sendError(w, http.StatusBadRequest, "specialty or icfDomain is required")
			return
		}
		specialty = service.DomainGeneralist(icfDomain)
	}
	lat, lon, err := parseCoordinates(q.Get("lat"), q.Get("lon"))
	if err != nil {
		sendError(w, http.StatusBadRequest, err.Error())
		return
	}
	serviceTypeCode := strings.TrimSpace(q.Get("serviceTypeCode"))

	recs, err := h.svc.FetchWithLocation(r.Context(), service.FetchParams{
		Specialty:       specialty,
		ServiceTypeCode: serviceTypeCode,
		ICFDomain:       strings.TrimSpace(q.Get("icfDomain")),
		Latitude:        lat,
		Longitude:       lon,
	})
	if err != nil {
		slog.Error("recommendations: aggregation failed", "err", err)
		sendError(w, http.StatusBadGateway, "failed to fetch recommendations")
		return
	}

	h.enrichWithBatch(r, recs)
	ranked := service.RankRecommendations(recs, serviceTypeCode)
	if len(ranked) > maxRecommendations {
		ranked = ranked[:maxRecommendations]
	}
	if len(ranked) == 0 {
		ranked = []service.Recommendation{}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"specialty":       specialty,
		"recommendations": ranked,
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

// enrichWithBatch computes the next free slot for each recommendation card
// using a single FHIR batch POST for all Slot queries (instead of one GET
// per recommendation).
func (h *RecommendationsHandler) enrichWithBatch(r *http.Request, recs []service.Recommendation) {
	now := time.Now()
	offset := service.ParseTZOffset("")

	// Collect paths and indices for recs that have a ScheduleID.
	var paths []string
	var indices []int
	for i := range recs {
		if recs[i].ScheduleID == "" {
			continue
		}
		paths = append(paths, service.BusySlotPath(recs[i].ScheduleID, now))
		indices = append(indices, i)
	}
	if len(paths) == 0 {
		return
	}

	resources, err := h.svc.FetchSlotBatch(r.Context(), paths)
	if err != nil {
		slog.Warn("recommendations: slot batch failed", "err", err)
		return
	}

	for j, res := range resources {
		if res == nil || j >= len(indices) {
			continue
		}
		busy, bErr := service.ParseBusySlotsBundle(res)
		if bErr != nil {
			slog.Warn("recommendations: parse busy slots failed", "err", bErr)
			continue
		}
		idx := indices[j]
		recs[idx].NextSlot = service.ComputeNextSlot(
			recs[idx].AvailableTime, busy, now, offset, recs[idx].DurationMinutes,
		)
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
