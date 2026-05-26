---
title: Dynamic Scheduling Model
description: Continuous availability instead of fixed appointment slots
status: accepted
date: 2026-05-26
---

# Context

Healthcare sessions have variable durations, mixed modalities (in-person,
telehealth), and non-uniform schedules. Fixed-slot systems are
operationally limiting. Assessment `006-data-types` confirms the current
system already models availability as DayOfWeek + TimeRange.

# Decision

Practitioners define working hours, clinic locations, services, and
recurrence rules. Backend computes intervals, overlaps, availability,
and conflict prevention on demand.

Alternatives considered: fixed 30/60 min slots (doesn't fit variable
durations), calendar-based booking (too rigid for healthcare).

# Impact

Dynamic scheduling accommodates real healthcare workflows. Backend
handles the complex interval math. Frontend displays computed
availability windows. Scheduling correctness stays server-authoritative.
