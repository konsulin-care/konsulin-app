# Specialty Ontology System

This package implements an ontology-based specialty system using ISCO-08
(structural hierarchy), NUCC (healthcare taxonomy), and authored ICF-domain
competence.

## Overview

Complaints route to specialties through two stages:

1. **Domain gate**: every NUCC code carries an authored `domainSignature` —
   the ICF paths its classification can competently serve
   (`config/specialty-competence.json`).
2. **In-pool rank**: within a complaint's declared ICF domain, codes are
   scored by `0.7 * keyword Jaccard + 0.3 * domain coverage`.

## Architecture

```
internal/data/specialty/
├── config/
│   ├── domains.json                      # ICF domains + fallbackNUccCode per domain
│   ├── specialty-competence.json         # classification -> ICF paths (authored)
│   ├── specialty-competence-exceptions.json  # NUCC code -> ICF paths (overrides)
│   ├── interview-map.json                # chief complaint -> icfDomain + keywords
│   ├── keyword-map.json                  # token -> domain path
│   ├── grouping-to-domain.json           # NUCC grouping -> core domain (fallback)
│   ├── classification-to-isco.json       # NUCC classification -> ISCO unit group
│   ├── isco-synonyms.json                # ISCO-08 synonym pairs
│   └── stop-words.json                   # tokenization stop words
├── cmd/generate/                         # generator (go:generate)
│   ├── main.go, domains.go               # competence signature application + review report
│   ├── resolution.go                     # domain-gated complaint resolution
│   ├── nucc.go, isco.go, keywords.go     # source parsing + keyword extraction
│   ├── proximity.go                      # proximity calculation
│   └── output.go, output_resolution.go   # output generation (shards, TS)
├── proximity/                            # generated proximity data (DO NOT EDIT)
├── index_data.json                       # generated runtime index (DO NOT EDIT)
├── types.go, index.go, match.go          # runtime lookup
└── generate.go                           # go:generate directive
```

## Usage

### Generate Data

```bash
make data-specialty
```

1. Download ISCO-08 and NUCC taxonomy files (cached for 24 hours)
2. Parse sources, extract keywords
3. Apply the authored competence matrix to every code's `domainSignature`
   (code exceptions override; grouping map backstops) — a per-classification
   review report is printed
4. Resolve all 41 interview complaints domain-gated (winner's signature
   always contains the complaint's declared `icfDomain`; `other-*` complaints
   pin the domain generalist)
5. Compute proximity, write 50 shards, `index_data.json`, and the TypeScript
   resolution/label maps

Regenerate when any config or taxonomy input changes.

### Runtime Matching

```go
idx := specialty.LoadIndex()
score := idx.GetProximity("207Q00000X", "2084P0800X")
codes := idx.LookupByKeyword("psychological")
```

### Domain pool (BFF)

`internal/service/domain_pool.go` derives the candidate pool from
`LoadIndex().ByNuccCode` (signature prefix match) and the domain generalist
(`DomainGeneralist`): exact → pool → generalist, capped at four cards.

## Proximity Calculation

```
proximity = 0.6 * clinical + 0.3 * domain + 0.1 * structural
```

- **clinical**: NUCC grouping/classification similarity
- **domain**: Jaccard similarity of competence signatures
- **structural**: ISCO-08 hierarchical distance

## Data Sharding

Proximity data is split into 50 shard files (`shard_00.go` through
`shard_49.go`) via `init()` on the shared `Generated` map.

## Testing

```bash
go test ./internal/data/specialty/... -v
```
