package wilayah

import "strings"

// BuildIndexes constructs a complete WilayahIndex from flat region data arrays.
func BuildIndexes(provinces []Province, regencies []Regency, districts []District, villages []Village) WilayahIndex {
	idx := WilayahIndex{
		Provinces: provinces,
		Regencies: regencies,
		Districts: districts,
		Villages:  villages,

		ProvinceByID: make(map[string]int),
		RegencyByID:  make(map[string]int),
		DistrictByID: make(map[string]int),
		VillageByID:  make(map[string]int),

		RegenciesByProvince: make(map[string][]int),
		DistrictsByRegency:  make(map[string][]int),
		VillagesByDistrict:  make(map[string][]int),

		ProvinceByName: make(map[string][]int),
		RegencyByName:  make(map[string][]int),
		DistrictByName: make(map[string][]int),
		VillageByName:  make(map[string][]int),
	}

	for i, p := range provinces {
		idx.ProvinceByID[p.ID] = i
		name := strings.ToLower(p.Name)
		idx.ProvinceByName[name] = append(idx.ProvinceByName[name], i)
	}

	for i, r := range regencies {
		idx.RegencyByID[r.ID] = i
		idx.RegenciesByProvince[r.ProvinceID] = append(idx.RegenciesByProvince[r.ProvinceID], i)
		name := strings.ToLower(r.Name)
		idx.RegencyByName[name] = append(idx.RegencyByName[name], i)
	}

	for i, d := range districts {
		idx.DistrictByID[d.ID] = i
		idx.DistrictsByRegency[d.RegencyID] = append(idx.DistrictsByRegency[d.RegencyID], i)
		name := strings.ToLower(d.Name)
		idx.DistrictByName[name] = append(idx.DistrictByName[name], i)
	}

	for i, v := range villages {
		idx.VillageByID[v.ID] = i
		idx.VillagesByDistrict[v.DistrictID] = append(idx.VillagesByDistrict[v.DistrictID], i)
		name := strings.ToLower(v.Name)
		idx.VillageByName[name] = append(idx.VillageByName[name], i)
	}

	return idx
}
