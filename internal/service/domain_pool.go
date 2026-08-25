package service

import (
	"sort"
	"strings"

	"github.com/konsulin-care/konsulin-app/internal/data/specialty"
)

// DomainGeneralist returns the domains.json generalist NUCC code for the given
// ICF core domain. mental/social/meaning domains route to the psychologist
// generalist (103T00000X); physical, functional, lifestyle and environmental
// domains route to the general practice generalist (208D00000X). Unknown
// domains fall back to the physical-health generalist.
func DomainGeneralist(icfDomain string) string {
	switch icfDomain {
	case "mental-emotional-health", "social-health-relationships", "meaning-purpose-fulfilment":
		return "103T00000X"
	default:
		return "208D00000X"
	}
}

// domainCodes returns every NUCC code whose competence signature contains a
// path in the given ICF core domain (bare-core or core.subdomain prefix
// match), excluding the given code, deterministic sorted order.
// An unknown or empty domain yields an empty pool.
func domainCodes(icfDomain, exclude string) []string {
	if icfDomain == "" {
		return nil
	}
	idx := specialty.LoadIndex()
	var out []string
	for code, node := range idx.ByNuccCode {
		if code == exclude {
			continue
		}
		if hasDomainPath(node.DomainSignature, icfDomain) {
			out = append(out, code)
		}
	}
	sort.Strings(out)
	return out
}

// hasDomainPath reports whether any signature path is in the domain: equal to
// the bare core or a core.subdomain of it.
func hasDomainPath(signature []string, domain string) bool {
	for _, p := range signature {
		if p == domain || strings.HasPrefix(p, domain+".") {
			return true
		}
	}
	return false
}
