---
title: Client-Side Free Interval Computation
description: Frontend computes bookable intervals from PractitionerRole availableTime, non-free Slots, and HealthcareService duration
status: proposed
remaining: 0
date: 2026-06-30
---

# Context

ADR-004 originally assigned interval computation to the backend (3rd-party FHIR server). However, the current architecture (ADR-015) makes Go BFF a pure proxy — no business logic. The 3rd-party backend (Blaze FHIR) currently pre-computes free Slot resources from PractitionerRole.availableTime. This is inflexible: different healthcare services (30min consultation, 60min therapy) need different slot durations, and the backend doesn't know about per-service duration. Options considered: (a) keep backend pre-computation but add per-service slot generation — complex backend changes, (b) move computation to frontend with backend only storing non-free slots and preventing race conditions.

# Decision

Frontend computes free bookable intervals client-side. The 3rd-party backend is simplified to only: (1) store non-free slots (busy-unavailable, busy-tentative, booked) and (2) handle race conditions (concurrent booking prevention). The frontend computes free windows by subtracting non-free Slots from PractitionerRole.availableTime ranges, then partitions by HealthcareService.duration. This makes slot duration per-service instead of per-Schedule. HealthcareService.duration is stored as a FHIR extension on the HealthcareService resource.

# Impact

Positive: (1) Per-service slot durations without backend changes. (2) Backend simplification — no pre-computation needed. (3) More dynamic — adding/changing service durations is frontend-only. (4) Booking correctness stays server-authoritative via race condition handling. Negative: (1) Frontend now owns interval math — needs thorough testing. (2) Client-side computation may be slower on large datasets (mitigated by caching and date-range scoping). (3) HealthcareService needs a duration extension — existing services without duration default gracefully. Supersedes ADR-004.
