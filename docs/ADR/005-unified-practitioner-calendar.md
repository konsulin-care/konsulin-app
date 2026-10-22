---
title: Unified Practitioner Calendar
description: One continuous calendar across all clinics for practitioners
status: accepted
date: 2026-05-26
---

# Context

Practitioners often work across multiple clinics but think operationally
as "my day" — not "clinic A appointments then clinic B appointments."
Assessment `001-pages-routes` confirms the schedule route renders all
appointments in a single view.

# Decision

Practitioners see one unified calendar aggregating all appointments
across clinics. Color coding, tags, and labels distinguish clinic
context instead of segmented columns.

Alternatives considered: segmented clinic columns (operationally confusing
for multi-clinic practitioners), per-clinic tabs (extra navigation).

# Impact

Simpler practitioner UX — one calendar to manage. Backend must tag each
appointment with clinic context. Frontend uses visual cues (color, tags)
for clinic distinction. Cross-clinic conflict detection required.
