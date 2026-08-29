---
title: Pricing Model
description: Composed pricing with base fee plus practitioner and system adjustments
status: accepted
date: 2026-05-26
---

# Context

Healthcare pricing needs organization governance with practitioner
flexibility. Organization sets canonical base fees. Practitioners may
adjust within bounds. System adds platform fees.

# Decision

Pricing formula: `final_fee = base_fee + practitioner_adjustment +
system_adjustment`. Organization governs base fees. Practitioners
may propose draft services and fees. Clinic admins approve.

Alternatives considered: fixed pricing (too rigid), practitioner-only
pricing (no governance), dynamic pricing per slot (over-engineered).

# Impact

Transparent pricing patients can understand before booking. Organization
retains governance. Practitioners have flexibility within bounds.
Frontend displays fee breakdown on recommendation cards.
