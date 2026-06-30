package handler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/konsulin-care/konsulin-app/internal/data/wilayah"
)

// WilayahHandler serves Indonesia administrative region data from a pre-built
// WilayahIndex. All endpoints return JSON arrays directly from the index.
type WilayahHandler struct {
	index *wilayah.WilayahIndex
}

// NewWilayahHandler creates a handler that reads from the given pre-built index.
func NewWilayahHandler(index *wilayah.WilayahIndex) *WilayahHandler {
	return &WilayahHandler{index: index}
}

// Provinces returns all provinces as a JSON array.
func (h *WilayahHandler) Provinces(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.index.Provinces)
}

// ProvinceSearch returns provinces whose lowercase name starts with the ?q= query.
func (h *WilayahHandler) ProvinceSearch(w http.ResponseWriter, r *http.Request) {
	q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	if q == "" {
		writeJSON(w, http.StatusOK, []wilayah.Province{})
		return
	}
	writeJSON(w, http.StatusOK, h.searchProvinces(q))
}

func (h *WilayahHandler) searchProvinces(q string) []wilayah.Province {
	seen := make(map[int]bool)
	for name, indices := range h.index.ProvinceByName {
		if strings.HasPrefix(name, q) {
			for _, idx := range indices {
				seen[idx] = true
			}
		}
	}
	out := make([]wilayah.Province, 0, len(seen))
	for idx := range h.index.Provinces {
		if seen[idx] {
			out = append(out, h.index.Provinces[idx])
		}
	}
	return out
}

// Regencies returns regencies for the given province ID from the URL param.
func (h *WilayahHandler) Regencies(w http.ResponseWriter, r *http.Request) {
	provinceID := chi.URLParam(r, "provinceId")
	indices := h.index.RegenciesByProvince[provinceID]
	out := make([]wilayah.Regency, 0, len(indices))
	for _, idx := range indices {
		out = append(out, h.index.Regencies[idx])
	}
	writeJSON(w, http.StatusOK, out)
}

// RegencySearch searches regencies by name prefix and optionally narrows by province.
func (h *WilayahHandler) RegencySearch(w http.ResponseWriter, r *http.Request) {
	q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	provinceID := r.URL.Query().Get("province")
	writeJSON(w, http.StatusOK, h.searchRegencies(q, provinceID))
}

func (h *WilayahHandler) searchRegencies(q, provinceID string) []wilayah.Regency {
	candidates := h.regencyCandidates(q, provinceID)
	out := make([]wilayah.Regency, 0, len(candidates))
	for _, idx := range candidates {
		r := h.index.Regencies[idx]
		if provinceID == "" || r.ProvinceID == provinceID {
			out = append(out, r)
		}
	}
	return out
}

func (h *WilayahHandler) regencyCandidates(q, provinceID string) []int {
	if q != "" {
		seen := make(map[int]bool)
		for name, indices := range h.index.RegencyByName {
			if strings.HasPrefix(name, q) {
				for _, idx := range indices {
					seen[idx] = true
				}
			}
		}
		result := make([]int, 0, len(seen))
		for idx := range seen {
			result = append(result, idx)
		}
		return result
	}
	if provinceID != "" {
		return h.index.RegenciesByProvince[provinceID]
	}
	result := make([]int, len(h.index.Regencies))
	for i := range h.index.Regencies {
		result[i] = i
	}
	return result
}

// Districts returns districts for the given regency ID from the URL param.
func (h *WilayahHandler) Districts(w http.ResponseWriter, r *http.Request) {
	regencyID := chi.URLParam(r, "regencyId")
	indices := h.index.DistrictsByRegency[regencyID]
	out := make([]wilayah.District, 0, len(indices))
	for _, idx := range indices {
		out = append(out, h.index.Districts[idx])
	}
	writeJSON(w, http.StatusOK, out)
}

// Villages returns villages for the given district ID from the URL param.
func (h *WilayahHandler) Villages(w http.ResponseWriter, r *http.Request) {
	districtID := chi.URLParam(r, "districtId")
	indices := h.index.VillagesByDistrict[districtID]
	out := make([]wilayah.Village, 0, len(indices))
	for _, idx := range indices {
		out = append(out, h.index.Villages[idx])
	}
	writeJSON(w, http.StatusOK, out)
}

// Lookup resolves an ID to its administrative level and returns a breadcrumb
// of parent entities. ID length determines the level:
//   - 2 chars → province
//   - 4 chars → regency
//   - 7 chars → district (also accepts 6 for legacy codes)
//   - 10 chars → village
func (h *WilayahHandler) Lookup(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	switch len(id) {
	case 2:
		h.lookupProvince(w, id)
	case 4:
		h.lookupRegency(w, id)
	case 6, 7:
		h.lookupDistrict(w, id)
	case 10:
		h.lookupVillage(w, id)
	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
	}
}
