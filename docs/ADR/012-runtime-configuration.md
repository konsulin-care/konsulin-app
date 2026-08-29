---
title: Runtime Configuration
description: Go reads environment variables directly at startup
status: accepted
date: 2026-05-26
---

# Context

The original proposal specified a startup injection flow (.env to script
to runtime-config.json to frontend fetch). This pattern is for SPAs that
need runtime config in the browser. In Go SSR, the server has direct
access to env vars at request time. Assessment `003-api-services` confirms
config values are already env-based.

# Decision

Go SSR server reads configuration directly from environment variables
at startup via `os.Getenv()`. A config struct is populated once and
injected into handlers via dependency injection.

Alternatives considered: startup injection (unnecessary indirection for
Go SSR), hardcoded config (not runtime-configurable), JSON file mounted
at deploy time (works but adds complexity).

# Impact

Simpler deployment — just `docker run -e KEY=VALUE`. Immutable Docker
images preserved. No startup scripts or intermediate files. All handlers
access config via injected struct. Runtime changes require container
restart (standard for 12-factor apps).
