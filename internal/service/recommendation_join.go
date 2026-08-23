package service

import (
	"encoding/json"
	"sort"
	"strings"
)

// parseRoleBundle converts a searchset Bundle into cross-referenced entities.
func parseRoleBundle(bundle *searchset) (*logicalBundle, error) {
	logical := &logicalBundle{
		Practitioners:      map[string]string{},
		PractitionerPhotos: map[string]string{},
		Locations:          map[string]locationResource{},
		Services:           map[string]parsedService{},
		SchedulesByRole:    map[string]string{},
	}

	for i := range bundle.Entry {
		if err := logical.insert(&bundle.Entry[i]); err != nil {
			return nil, err
		}
	}
	return logical, nil
}

// insert indexes one Bundle entry into the logical bundle by resource type.
func (l *logicalBundle) insert(entry *searchEntry) error {
	rt, _, err := resourceMeta(entry.Resource)
	if err != nil {
		return err
	}
	switch rt {
	case "PractitionerRole":
		role, err := decodeResource[roleResource](entry.Resource)
		if err != nil {
			return err
		}
		l.Roles = append(l.Roles, role)
	case "Practitioner":
		prac, err := decodeResource[practitionerResource](entry.Resource)
		if err != nil {
			return err
		}
		l.Practitioners[tailRef(prac.ID)] = practitionerDisplayName(prac)
		if len(prac.Photo) > 0 {
			l.PractitionerPhotos[tailRef(prac.ID)] = prac.Photo[0].URL
		}
	case "Location":
		loc, err := decodeResource[locationResource](entry.Resource)
		if err != nil {
			return err
		}
		l.Locations[tailRef(loc.ID)] = loc
	case "HealthcareService":
		svc, err := decodeResource[serviceResource](entry.Resource)
		if err != nil {
			return err
		}
		l.Services[tailRef(svc.ID)] = reduceService(svc)
	case "Schedule":
		sch, err := decodeResource[scheduleResource](entry.Resource)
		if err != nil {
			return err
		}
		l.addSchedule(sch)
	}
	return nil
}

// addSchedule indexes a Schedule under each actor PractitionerRole id.
func (l *logicalBundle) addSchedule(sch scheduleResource) {
	for _, actor := range sch.Actor {
		roleID := tailRef(actor.Reference)
		if roleID != "" {
			l.SchedulesByRole[roleID] = sch.ID
		}
	}
}

// decodeResource unmarshals a raw FHIR resource into a typed value.
func decodeResource[T any](raw json.RawMessage) (T, error) {
	var out T
	err := json.Unmarshal(raw, &out)
	return out, err
}

// buildCandidates produces one recommendation per role-service-location triple.
func buildCandidates(logical *logicalBundle, near map[string]float64, useNear bool) []Recommendation {
	var out []Recommendation
	for _, role := range logical.Roles {
		pracID := tailRef(role.Practitioner.Reference)
		if pracID == "" {
			continue
		}
		out = append(out, roleCandidates(logical, role, pracID, near, useNear)...)
	}
	return out
}

// roleCandidates expands one role into its per-location candidates.
func roleCandidates(logical *logicalBundle, role roleResource, pracID string, near map[string]float64, useNear bool) []Recommendation {
	var out []Recommendation
	for _, locRef := range role.Location {
		locID := tailRef(locRef.Reference)
		loc, ok := logical.Locations[locID]
		if !ok {
			continue
		}
		distanceKm := distanceFor(locID, near, useNear)
		if useNear && distanceKm == nil {
			continue
		}
		out = append(out, serviceCandidates(logical, role, pracID, loc, locID, distanceKm)...)
	}
	return out
}

// serviceCandidates expands a location into its per-service candidates.
func serviceCandidates(logical *logicalBundle, role roleResource, pracID string, loc locationResource, locID string, distanceKm *float64) []Recommendation {
	var out []Recommendation
	for _, svcID := range serviceIDs(role) {
		svc, ok := logical.Services[svcID]
		if !ok {
			continue
		}
		out = append(out, makeRecommendation(logical, role, pracID, loc, locID, distanceKm, svc))
	}
	return out
}

// distanceFor converts the FHIR valueDistance (meters) to km for the badge.
func distanceFor(locID string, near map[string]float64, useNear bool) *float64 {
	if !useNear {
		return nil
	}
	meters, ok := near[locID]
	if !ok {
		return nil
	}
	km := meters / 1000
	return &km
}

// makeRecommendation assembles one card from joined entities.
func makeRecommendation(logical *logicalBundle, role roleResource, pracID string, loc locationResource, locID string, distanceKm *float64, svc parsedService) Recommendation {
	return Recommendation{
		PractitionerRoleID:    role.ID,
		PractitionerID:        pracID,
		PractitionerName:      logical.Practitioners[pracID],
		PractitionerPhoto:     logical.PractitionerPhotos[pracID],
		Specialties:           roleSpecialties(role),
		ScheduleID:            logical.SchedulesByRole[role.ID],
		HealthcareServiceID:   svc.ID,
		HealthcareServiceName: svc.Name,
		DurationMinutes:       svc.DurMinutes,
		Fee:                   svc.Fee,
		Currency:              svc.Currency,
		LocationID:            locID,
		LocationName:          loc.Name,
		LocationAddress:       loc.Address,
		DistanceKm:            distanceKm,
		AvailableTime:         roleAvailableTime(role),
		serviceTypeCodes:      svc.TypeCodes,
	}
}

// distinctSpecialtiesFromBundle collects sorted unique specialty names.
func distinctSpecialtiesFromBundle(bundle *searchset) []string {
	seen := map[string]bool{}
	var out []string
	for i := range bundle.Entry {
		rt, _, err := resourceMeta(bundle.Entry[i].Resource)
		if err != nil || rt != "PractitionerRole" {
			continue
		}
		var role roleResource
		if err := json.Unmarshal(bundle.Entry[i].Resource, &role); err != nil {
			continue
		}
		for _, s := range roleSpecialties(role) {
			key := strings.ToLower(s)
			if s != "" && !seen[key] {
				seen[key] = true
				out = append(out, s)
			}
		}
	}
	sort.Strings(out)
	return out
}

// serviceIDs returns the bare HealthcareService ids referenced by the role.
func serviceIDs(role roleResource) []string {
	out := make([]string, 0, len(role.HealthcareService))
	for _, ref := range role.HealthcareService {
		if id := tailRef(ref.Reference); id != "" {
			out = append(out, id)
		}
	}
	return out
}

// roleSpecialties collects the display text of the role's specialty codings.
func roleSpecialties(role roleResource) []string {
	var out []string
	for _, spec := range role.Specialty {
		text := spec.Text
		if text == "" && len(spec.Coding) > 0 {
			text = spec.Coding[0].Display
		}
		if text != "" {
			out = append(out, text)
		}
	}
	return out
}

// roleAvailableTime converts PractitionerRole.availableTime to service windows.
func roleAvailableTime(role roleResource) []AvailableTimeWindow {
	out := make([]AvailableTimeWindow, 0, len(role.AvailableTime))
	for _, at := range role.AvailableTime {
		out = append(out, AvailableTimeWindow{
			DaysOfWeek: at.DaysOfWeek,
			StartTime:  strings.TrimSuffix(at.AvailableStartTime, ":00"),
			EndTime:    strings.TrimSuffix(at.AvailableEndTime, ":00"),
		})
	}
	return out
}

// dedupByPractitioner keeps the single best candidate per practitioner.
// Preference: service type matching the requested intent (serviceTypeCode,
// falling back to the requested NUCC specialty), then lowest fee,
// then the first encountered candidate.
func dedupByPractitioner(candidates []Recommendation, specialty, serviceTypeCode string) []Recommendation {
	best := map[string]Recommendation{}
	order := []string{}
	for _, cand := range candidates {
		key := cand.PractitionerID
		current, ok := best[key]
		if !ok {
			best[key] = cand
			order = append(order, key)
			continue
		}
		if betterCandidate(cand, current, specialty, serviceTypeCode) {
			best[key] = cand
		}
	}
	out := make([]Recommendation, 0, len(order))
	for _, key := range order {
		out = append(out, best[key])
	}
	return out
}

// betterCandidate reports whether candidate a beats candidate b.
func betterCandidate(a, b Recommendation, specialty, serviceTypeCode string) bool {
	aMatch := candidateMatchesIntent(a, serviceTypeCode, specialty)
	bMatch := candidateMatchesIntent(b, serviceTypeCode, specialty)
	if aMatch != bMatch {
		return aMatch
	}
	return a.Fee < b.Fee
}

// candidateMatchesIntent reports whether the service type matches the request.
// The requested serviceTypeCode is the primary signal; a service typed with
// the NUCC specialty code remains the legacy fallback so callers without a
// serviceTypeCode keep their behavior.
func candidateMatchesIntent(r Recommendation, serviceTypeCode, specialty string) bool {
	for _, code := range r.serviceTypeCodes {
		if code == serviceTypeCode || code == specialty || strings.EqualFold(code, specialty) {
			return true
		}
	}
	return false
}
