---
title: Domain-Gated Specialty Routing
description: Route complaints to specialties via an authored competence matrix and ICF-domain pool, removing unrelated fallback fill
status: accepted
date: 2026-08-23
---

# Context

Recommendations for a burnout complaint surfaced unrelated specialists
(orthopaedic surgery, ENT, OB/GYN, ophthalmology). Root causes:

1. **Resolution is unconstrained text overlap.** `bestMatchingCode` races
   all 883 NUCC codes by weighted Jaccard over TF-IDF keywords, so a
   complaint can land on a clinically absurd code (e.g. self-esteem on
   Forensic Psychologist), and psychiatry can outrank its clinically
   adjacent psychologists.

2. **Related expansion mis-scopes mental-health providers.** Proximity
   weights NUCC grouping/classification at 0.6, so psychiatry ↔
   psychologist scores 0.12 while psychiatry ↔ ophthalmology scores
   0.41. Psychologists are below the 0.4 related threshold and never
   enter the fill pool.

3. **Guaranteed-five fill is unrelated.** `fillWithFallback` calls
   `anyPractitionerRoleQuery` (any active practitioner, newest first)
   when the exact+related pool is short, tagging cards
   `matchSource: fallback`. A sparse data set thus shows unrelated
   cards for a mental-health complaint.

Options considered: per-complaint override pins (does not scale),
keyword-map retuning (global cross-complaint side effects), proximity
reweighting (separate follow-up), and domain-gated candidate
generation. Adopted: domain-gated routing with an authored competence
matrix.

# Decision

1. **Classification-level competence matrix.** New authored config
   `internal/data/specialty/config/specialty-competence.json` maps each of
   the 163 Individual (grouping, classification) pairs in the NUCC cache to
   the ICF domain paths the specialty can competently serve, keyed
   `"Grouping|Classification"`; per-code exceptions live in
   `specialty-competence-exceptions.json` (forensic psychologist, pulmonary
   disease, gastroenterology). The `domainSignature` of every generated
   code becomes the matrix value for its classification (deep codes
   inherit); the exception file overrides specific codes.
   `grouping-to-domain.json` remains the fallback for absent
   classifications (expected: none). `domains.json` `fallbackNuccCode` is
   untouched.

2. **Domain-gated resolution.** `resolveInterviewNodes` selects the
   candidate pool as codes whose `domainSignature` intersects the
   complaint's declared `icfDomain`, then ranks inside the pool by
   `0.7 * keyword Jaccard + 0.3 * domain coverage` (coverage measures how
   much of the complaint's keyword-derived domain set the code's
   competence covers, avoiding the symmetric-Jaccard penalty that rewards
   underspecified signatures). Cross-domain winners become structurally
   impossible. `other-*` complaints keep the domain generalist.

3. **BFF derives the domain pool from `icfDomain`.** `specialty` becomes
   optional; when absent the handler derives it. The service builds the
   pool from the embedded index (`LoadIndex().ByNuccCode`, prefix match
   on `DomainSignature`). Cascade levels: exact code → domain pool →
   domain generalist. `fillWithFallback` no longer calls
   `anyPractitionerRoleQuery`; it fills from pool then generalist, only
   up to four cards, fewer allowed.

4. **Cap four cards.** `maxRecommendations` becomes 4 in both the
   service and the handler. Fewer-than-four results are valid.

5. **Deferred (separate ADR).** psych↔psychol proximity reweighting.

# Impact

- Every decision-tree complaint resolves deterministically to a code
  whose `domainSignature` contains the complaint's declared `icfDomain`;
  provable from regenerated data plus generator tests.
- The BFF returns 0–4 cards, all from the complaint's ICF-domain pool or
  its generalist, ordered exact → related → generalist-fallback. No
  unrelated specialties under any data condition.
- `anyPractitionerRoleQuery` becomes dead code and is removed.
- The fine-grained in-pool ranking is still lexical (keyword Jaccard);
  its quirks are bounded to the domain pool, not the whole ontology.
  Empirical winners after the change: burnout → Psychologist,
  respiratory-airway → Pulmonary Disease, gastrointestinal →
  Gastroenterology, smoking → Addiction Psychologist, self-esteem →
  Psychologist (forensic psychology is excluded from the meaning pool via
  a code exception).
- **Seed dependency (no code change here):** the FHIR seeds (Blaze,
  external) must attach `burnout-care` typed HealthcareServices to
  psychologist/counselor roles so mental-pool roles exist. Until then
  the route degrades gracefully to fewer than four cards rather than
  showing unrelated cards.
- Proximity table regenerates from competence-based signatures, which
  already raises psychiatry↔psychology domain overlap; explicit
  reweighting of the clinical term is deferred.
