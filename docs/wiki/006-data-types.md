---
title: Data Types Assessment
description: FHIR types, constants, enums
domain: frontend
action: stay
dependencies: []
---

# Summary

Type definitions and constants are framework-agnostic. They define
FHIR resource shapes, domain enums, and configuration constants.
These translate directly to Go structs and constants.

# Type Inventory

| File                    | Contents                                 | Go equivalent    |
| ----------------------- | ---------------------------------------- | ---------------- |
| `types/appointment.ts`  | MergedAppointment, MergedSession         | Go struct        |
| `types/assessment.ts`   | IQuestionnaireResponse                   | Go struct        |
| `types/availability.ts` | DayOfWeek, TimeRange, WeeklyAvailability | Go struct + enum |
| `types/organization.ts` | Organization types                       | Go struct        |
| `types/practitioner.ts` | IPractitionerRoleDetail                  | Go struct        |
| `types/record.ts`       | Record types                             | Go struct        |
| `types/schedule.ts`     | MarkUnavailabilityRequest/Response       | Go struct        |
| `types/wilayah.ts`      | Indonesian region types                  | Go struct        |

# Constant Inventory

| File                             | Contents                                  | Go equivalent |
| -------------------------------- | ----------------------------------------- | ------------- |
| `constants/roles.ts`             | Roles enum (Practitioner, Patient, Guest) | Go iota enum  |
| `constants/anonymous-session.ts` | System URL, storage keys                  | Go const      |
| `constants/profile.ts`           | Profile constants                         | Go const      |
| `constants/record.ts`            | Record constants                          | Go const      |

# Business Rules

- PractitionerRole relationships determine scheduling
- Availability uses DayOfWeek + TimeRange pattern
- MergedAppointment combines FHIR Appointment + related resources
- Anonymous sessions use system URL identifiers
