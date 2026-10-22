---
title: Agentic Documentation internal/config
description: Runtime configuration — env var loading and config struct injection
---

## Relevant ADRs

| ADR | Rationale                                                                           |
| --- | ----------------------------------------------------------------------------------- |
| 012 | Config struct populated via `os.Getenv()` at startup, injected into handlers via DI |

## Rules

- Config struct populated once at startup; never call `os.Getenv()` outside config initialization
- Validate every env var at startup; use `os.LookupEnv()` or typed parsers with error fatalf
- Config is immutable after startup — runtime changes require container restart (12-factor app)
- Do not embed secrets in config struct; reference env vars or secret manager paths only
- Config struct must have exported fields with `env` or `json` tags for documentation / debugging
