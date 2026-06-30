package handler

import (
	"net/http"

	"github.com/konsulin-care/konsulin-app/internal/data/wilayah"
)

func (h *WilayahHandler) lookupProvince(w http.ResponseWriter, id string) {
	idx, ok := h.index.ProvinceByID[id]
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	p := h.index.Provinces[idx]
	writeJSON(w, http.StatusOK, lookupEntry{
		ID:      p.ID,
		Name:    p.Name,
		Level:   "province",
		Parents: []parentEntry{},
	})
}

func (h *WilayahHandler) lookupRegency(w http.ResponseWriter, id string) {
	idx, ok := h.index.RegencyByID[id]
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	r := h.index.Regencies[idx]
	province := h.lookupParentProvince(r.ProvinceID)
	parents := []parentEntry{}
	if province != nil {
		parents = append(parents, *province)
	}
	writeJSON(w, http.StatusOK, lookupEntry{
		ID:      r.ID,
		Name:    r.Name,
		Level:   "regency",
		Parents: parents,
	})
}

func (h *WilayahHandler) lookupDistrict(w http.ResponseWriter, id string) {
	idx, ok := h.index.DistrictByID[id]
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	d := h.index.Districts[idx]
	parents := h.buildDistrictParents(d)
	writeJSON(w, http.StatusOK, lookupEntry{
		ID:      d.ID,
		Name:    d.Name,
		Level:   "district",
		Parents: parents,
	})
}

func (h *WilayahHandler) buildDistrictParents(d wilayah.District) []parentEntry {
	parents := []parentEntry{}
	if p := h.lookupParentProvince(d.RegencyID[:2]); p != nil {
		parents = append(parents, *p)
	}
	if r := h.lookupParentRegency(d.RegencyID); r != nil {
		parents = append(parents, *r)
	}
	return parents
}

func (h *WilayahHandler) lookupVillage(w http.ResponseWriter, id string) {
	idx, ok := h.index.VillageByID[id]
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	v := h.index.Villages[idx]
	parents := h.buildVillageParents(v)
	writeJSON(w, http.StatusOK, lookupEntry{
		ID:      v.ID,
		Name:    v.Name,
		Level:   "village",
		Parents: parents,
	})
}

func (h *WilayahHandler) buildVillageParents(v wilayah.Village) []parentEntry {
	parents := []parentEntry{}
	if p := h.lookupParentProvince(v.DistrictID[:2]); p != nil {
		parents = append(parents, *p)
	}
	if r := h.lookupParentRegency(v.DistrictID[:4]); r != nil {
		parents = append(parents, *r)
	}
	if d := h.lookupParentDistrict(v.DistrictID); d != nil {
		parents = append(parents, *d)
	}
	return parents
}

func (h *WilayahHandler) lookupParentProvince(id string) *parentEntry {
	idx, ok := h.index.ProvinceByID[id]
	if !ok {
		return nil
	}
	p := h.index.Provinces[idx]
	return &parentEntry{ID: p.ID, Name: p.Name, Level: "province"}
}

func (h *WilayahHandler) lookupParentRegency(id string) *parentEntry {
	idx, ok := h.index.RegencyByID[id]
	if !ok {
		return nil
	}
	r := h.index.Regencies[idx]
	return &parentEntry{ID: r.ID, Name: r.Name, Level: "regency"}
}

func (h *WilayahHandler) lookupParentDistrict(id string) *parentEntry {
	idx, ok := h.index.DistrictByID[id]
	if !ok {
		return nil
	}
	d := h.index.Districts[idx]
	return &parentEntry{ID: d.ID, Name: d.Name, Level: "district"}
}
