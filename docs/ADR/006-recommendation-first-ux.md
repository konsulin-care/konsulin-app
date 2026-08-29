---
title: Recommendation-First Patient UX
description: Patients see curated recommendations before full calendars
status: accepted
date: 2026-05-26
---

# Context

Patients optimize for speed, trust, convenience, and transparency —
not healthcare infrastructure navigation. Showing full calendars first
overwhelms patients. Assessment `001-pages-routes` shows the current
app has a recommendation-based booking flow.

# Decision

Patients first see curated appointment recommendation cards showing
practitioner, specialty, HealthcareService, duration, modality, final
fee, and nearest availability. Full calendar access is secondary.

Alternatives considered: calendar-first (clinical but overwhelming),
search-only (requires patients to know what they need).

# Impact

Improves booking completion rate. Frontend SSR must compute recommendations
on every request. Recommendation ranking algorithm directly affects UX.
Backend provides availability data; frontend shapes the presentation.
