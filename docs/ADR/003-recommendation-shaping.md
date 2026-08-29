---
title: Recommendation Shaping
description: Frontend SSR layer computes recommendations from FHIR resources
status: accepted
date: 2026-05-26
---

# Context

Patients need curated appointment recommendations. Backend only serves
FHIR resources. Assessment `003-api-services` confirms the frontend
already handles data aggregation patterns.

# Decision

Go SSR frontend computes recommendation displays from raw FHIR resources.
It filters PractitionerRoles by specialty, evaluates nearest availability,
ranks results, and displays HealthcareServices with fees.

Alternatives considered: backend recommendation endpoint (pollutes FHIR API),
client-side computation (increases JS payload, contradicts low-memory goal).

# Impact

SSR keeps logic on server where it has full FHIR context and fast internal
connectivity. Recommendation algorithm can evolve without backend changes.
Magic link URLs map intent parameters to FHIR search queries.
