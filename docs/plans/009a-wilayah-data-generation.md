---
title: Wilayah Data Generation
description: go:generate crawler + pre-built hashmap indexes for Indonesia region data
date: 2026-05-27
---

# Overview

The clinic filter uses Indonesia region data from `https://github.com/emsifa/api-wilayah-indonesia/tree/master/static/api`. Currently proxied through Next.js API routes which fetch per-level JSON files at runtime (provinces, regencies/{id}, districts/{id}, villages/{id}).

A `go:generate` crawler downloads ALL data at build time, combines it into a single Go source file with pre-built hashmap indexes. Zero network calls at runtime, zero init() cost — the indexes are ready when the binary starts.

The index enables:

- O(1) hierarchical nav: province -> regency -> district -> village
- O(1) ID lookup: reconstruct full breadcrumb from any saved ID
- Case-insensitive name search via inverted index

# Goals

- `go:generate` script crawls full wilayah tree -> writes `internal/data/wilayah/data.go`
- Pre-built hashmap indexes: by ID, by parent, by name (inverted)
- No runtime network calls, no init() processing

# Implementation Steps

- [ ] Create `internal/data/wilayah/types.go` — Province, Regency, District, Village structs
- [ ] Create `internal/data/wilayah/index.go` — WilayahIndex struct with all hashmap fields:
      `     Provinces, Regencies, Districts, Villages        // flat arrays
    ProvinceByID, RegencyByID, DistrictByID, VillageByID  // map[string]int
    RegenciesByProvince, DistrictsByRegency, VillagesByDistrict  // map[string][]int
    ProvinceByName, RegencyByName, DistrictByName, VillageByName  // map[string][]int
    `
- [ ] Create `internal/data/wilayah/download.go` — generator script that: 1. GET provinces.json -> 38 provinces 2. For each: GET regencies/{id}.json -> ~514 regencies 3. For each: GET districts/{id}.json -> ~7,200 districts 4. For each: GET villages/{id}.json -> ~83,000 villages 5. Builds all hashmap indexes 6. Writes `internal/data/wilayah/data.go` with complete WilayahIndex literal
- [ ] Create `internal/data/wilayah/generate.go` — `//go:generate go run download.go`
- [ ] Run `go generate ./internal/data/wilayah/` -> commit generated `data.go`

# Reference

@https://github.com/emsifa/api-wilayah-indonesia/tree/master/static/api:

- Data source: provinces.json, regencies/{id}.json, districts/{id}.json, villages/{id}.json
- Downloaded once by go:generate; committed to repo

# Risks

| Risk                                       | Likelihood | Impact | Mitigation                                                             |
| ------------------------------------------ | ---------- | ------ | ---------------------------------------------------------------------- |
| Upstream data format changes               | Low        | Medium | Pin download script to current JSON schema; regenerate on failure      |
| Generated data.go is large (~100k records) | Medium     | Low    | Go compiler handles large literals; binary size increase is acceptable |
| Crawler makes ~8,000 HTTP requests         | Medium     | Low    | Single-threaded crawl with delays; cached in repo after first run      |

# UAT

1. Run `go generate ./internal/data/wilayah/` — script completes, `data.go` created
2. `go build ./...` — compiles without errors
