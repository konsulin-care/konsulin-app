---
title: Backend FHIR Compliance
description: Backend remains strictly FHIR R4 without non-standard endpoints
status: accepted
date: 2026-05-26
---

# Context

Backend serves scheduling, booking, and healthcare data. Introducing
convenience endpoints would compromise interoperability and long-term
maintainability. Assessment `003-api-services` shows all current API
calls target FHIR endpoints.

# Decision

Backend remains strictly FHIR R4 compliant. No custom convenience
endpoints. Frontend SSR layer handles multi-resource aggregation,
recommendation shaping, and display computation.

Alternatives considered: custom REST endpoints (faster initial development,
harder long-term maintenance), GraphQL wrapper (added complexity without
interoperability gain).

# Impact

Frontend must aggregate PractitionerRole, HealthcareService, availability,
and fee data from multiple FHIR queries. Backend retains scheduling
authority and validation. Pure FHIR preserves healthcare portability.
