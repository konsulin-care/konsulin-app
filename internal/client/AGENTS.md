---
title: Agentic Documentation internal/client
description: HTTP clients for external backend API calls and local JWT session verification
---

## Package purpose

Package `client` provides HTTP clients that communicate with external backend
services, and local helpers for session verification. Every function in this
package either makes an outbound HTTP call or performs local cryptographic /
data extraction on tokens already held by the server.

## File responsibilities

| File                   | Contents                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `anonymous_session.go` | `FetchAnonymousSession` — POSTs to the backend's `/auth/anonymous-session` endpoint to obtain a guest ID and JWT token. Called by `OptionalAuth` middleware.        |
| `session_verify.go`    | `VerifySession` — decodes and validates the `sAccessToken` JWT locally. Extracts the `sub` claim as the verified user ID and checks the `exp` claim for expiration. |

## Key constraints

- **Session verification delegated to backend.** The external backend service
  (which connects privately to SuperTokens) is responsible for all SuperTokens
  session and token verification. This Go server performs lightweight local JWT
  decoding — it never makes HTTP calls to SuperTokens endpoints.
