---
title: Read-Only Batch Cache
description: Keep the BFF shared cache across batch POSTs whose entries only read
status: accepted
date: 2026-06-03
---

# Context

ADR 030 caches guest-readable public catalog GETs and invalidates a resource
type on any write through the BFF. A Bundle POST on `/fhir` invalidates
everything.

The research reads are not single GETs. Study lists, counts and related
records load through one `POST /fhir` batch Bundle whose entries are all
`GET`. The cache treated that read-only POST as a write, so every study list
load wiped the whole shared cache. The next catalogue read then missed and
went to the FHIR server, defeating the cache on the busiest page.

# Decision

Amend ADR 030: a batch POST on `/fhir` invalidates the shared cache only when
at least one entry writes. A read-only batch never invalidates.

**Detection**

- Only a `POST` to the `/fhir` root is inspected. Per-resource writes keep
  the ADR 030 invalidation rules unchanged.
- The body must be a `Bundle` with `type: "batch"` and at least one entry.
- Every entry must carry `request.method` equal to `GET`, case-insensitive.
- Malformed JSON, an empty body, a non-batch Bundle, a missing `request`, or
  any non-GET method is a write and invalidates as before.
- Bodies larger than 8 MiB are streamed unchanged and treated as writes, so a
  hostile payload cannot exhaust proxy memory.
- The body is buffered, then restored, so the upstream request still receives
  the original payload byte for byte.

**Caching scope**

- Only GET responses are stored, as in ADR 030. The read-only batch response
  itself is forwarded and never cached.
- The cache key still contains no identity. A read-only batch can only reach
  the cache through the GETs it does not invalidate; it cannot widen what is
  cacheable or leak a response across identities.
- Single-flight, entry-size caps, the allowlist and the no-`Set-Cookie` rule
  apply unchanged.

**Read type**

- `Bundle`, `batch` and `transaction` are not added to the cacheable type
  allowlist. Ignoring a read-only batch is an invalidation change, not a new
  cacheable key.

# Impact

- Loading the study catalogue no longer clears the shared cache, so repeated
  public reads keep hitting the cache until the 24-hour TTL.
- A batch that mixes reads and writes still invalidates everything, as in
  ADR 030. Detection fails closed on every ambiguity.
- Buffering a batch body costs at most 8 MiB of transient memory per inspected
  request.
- Invalidations from non-batch writes are unchanged; the amendment narrows
  only the `POST /fhir` path.
