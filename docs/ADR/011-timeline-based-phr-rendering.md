---
title: Timeline-Based PHR Rendering
description: Progressive loading of personal health records as timelines
status: accepted
date: 2026-05-26
---

# Context

FHIR bundles for personal health records can become very large. Loading
everything at once exceeds mobile memory budgets. Assessment `004-state-
management` confirms the current app already uses progressive loading
patterns.

# Decision

Render personal health records as chronological timelines with progressive
expansion. Initial load shows only recent items, latest assessments, recent
encounters, and summarized conditions. Additional records load on scroll,
by category, or by older time windows.

Alternatives considered: full bundle load (exceeds 100 MB mobile target),
paginated tables (poor UX for timeline view).

# Impact

Reduces initial payload and mobile RAM consumption. HTMX handles lazy
loading via hx-trigger on scroll. Backend must support paginated FHIR
queries. Timeline view improves cognitive navigation of health history.
