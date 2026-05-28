---
title: Wilayah HTTP Handler
description: API endpoints using pre-built wilayah data index
date: 2026-05-27
---

# Overview

After plan 009a generates the `WilayahIndex` with pre-built hashmap lookups, this plan creates the HTTP handler that exposes it through REST API endpoints. The handler replaces the three Next.js API routes (`/api/provinces`, `/api/cities/{code}`, `/api/districts/{code}`) and adds search and breadcrumb endpoints.

All endpoints return JSON directly from the index — no network calls, no database queries.

# Goals

- Replace Next.js API routes with Go handler endpoints
- Add search endpoint for case-insensitive name matching
- Add lookup endpoint for breadcrumb reconstruction from any ID

# Implementation Steps

- [ ] Create `internal/handler/wilayah.go`: - `GET /api/provinces` -> `Index.Provinces` - `GET /api/provinces/search?q=ja` -> prefix match on `Index.ProvinceByName` - `GET /api/regencies/{provinceId}` -> `Index.RegenciesByProvince[provinceId]` - `GET /api/regencies/search?q=band&province=32` -> filtered name search - `GET /api/districts/{regencyId}` -> `Index.DistrictsByRegency[regencyId]` - `GET /api/villages/{districtId}` -> `Index.VillagesByDistrict[districtId]` - `GET /api/lookup/{id}` -> detect level from ID length, return breadcrumb:
      province (2 digits) -> regency (4 digits) -> district (7 digits) -> village (10 digits)
- [ ] Register routes in Chi router
- [ ] Write `internal/handler/wilayah_test.go`

# Reference

@src/app/api/provinces/route.ts:

- GET handler: fetched `https://wilayah.id/api/provinces.json` per request
- Replace: Go returns `Index.Provinces` directly — zero network

@src/app/api/cities/[provinceCode]/route.ts:

- GET handler: fetched per-province JSON per request
- Replace: Go returns `Index.RegenciesByProvince[code]` — O(1) map lookup

@src/app/api/districts/[cityCode]/route.ts:

- GET handler: fetched per-city JSON per request
- Replace: Go returns `Index.DistrictsByRegency[code]` — O(1) map lookup

@src/services/api/cities.tsx:

- Client calls `/api/provinces`, `/api/cities/{code}`, `/api/districts/{code}`
- No changes needed — endpoint paths unchanged

@src/app/clinic/clinic-filter.tsx:

- Consumes region data for dropdowns
- No changes needed — endpoints unchanged, search endpoints are additive

# Risks

| Risk                                               | Likelihood | Impact | Mitigation                                                        |
| -------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------- |
| ID length heuristic for level detection is fragile | Low        | Medium | Use explicit level field in index; fall back to scanning all maps |

# UAT

1. `GET /api/provinces` — returns 38 provinces
2. `GET /api/regencies/32` — returns regencies for Jawa Barat
3. `GET /api/districts/3204` — returns districts for Kabupaten Bandung
4. `GET /api/villages/3204050` — returns villages in Dayeuhkolot
5. `GET /api/lookup/3204050` — returns breadcrumb: Jawa Barat -> Kab. Bandung -> Dayeuhkolot
6. `GET /api/provinces/search?q=ja` — returns provinces matching "ja"
