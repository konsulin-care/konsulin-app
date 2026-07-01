package wilayah

import "strings"

// knownAbbreviations are administrative abbreviations that must remain uppercase.
var knownAbbreviations = map[string]bool{
	"DI":  true,
	"DKI": true,
}

// NormalizeName converts a location name to Title Case while preserving
// known abbreviations (DI, DKI) as uppercase.
func NormalizeName(name string) string {
	if name == "" {
		return ""
	}
	words := strings.Fields(name)
	for i, w := range words {
		upper := strings.ToUpper(w)
		if knownAbbreviations[upper] {
			words[i] = upper
		} else {
			words[i] = strings.ToUpper(w[:1]) + strings.ToLower(w[1:])
		}
	}
	return strings.Join(words, " ")
}

// NormalizeAllNames applies NormalizeName to all names in the four wilayah slices in place.
func NormalizeAllNames(provinces []Province, regencies []Regency, districts []District, villages []Village) {
	for i := range provinces {
		provinces[i].Name = NormalizeName(provinces[i].Name)
	}
	for i := range regencies {
		regencies[i].Name = NormalizeName(regencies[i].Name)
	}
	for i := range districts {
		districts[i].Name = NormalizeName(districts[i].Name)
	}
	for i := range villages {
		villages[i].Name = NormalizeName(villages[i].Name)
	}
}
