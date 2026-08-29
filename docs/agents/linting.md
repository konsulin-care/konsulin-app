---
title: Linting and Performance Standards
description: Cognitive complexity, file size, and code structure limits
date: 2026-05-26
---

# Cognitive Complexity

- Maximum cognitive complexity per function: 15 (measured by gocyclo or equivalent)
- Exception: `main()` and config setup may exceed 15 if justified in a comment

# File Length

- Maximum file length for `.go` files: 300 lines
- Maximum file length for `.templ` files: 300 lines
- Exception: generated code or auto-generated mocks

# Function Size

- Maximum function body: 50 lines unless justified
- Maximum handler body: 20 lines; delegate business logic to service layer

# Import Rules

- No circular imports between `internal/` packages
- Dependency direction: `handler/` → `service/` → `fhir/` + `config/` (never reverse)
- `internal/` packages may not import `cmd/` or `web/`
