# Consolidate to Single `anon_session` Cookie

## WP-1: Go BFF middleware — remove active fetching, switch to `anon_session`

- [ ] Remove active Tier 3 fetching + IP cache from optional_auth.go
- [ ] Add JWT decode helper (base64 decode JWT payload for guest_id)
- [ ] Switch middleware to read/write `anon_session` (JWT) instead of `guest_session` (JSON)
- [ ] Set HttpOnly=true on cookie

## WP-2: Config and wiring

- [ ] Rename `GuestSessionCookieName` → `AnonSessionCookieName` in config.go
- [ ] Update main.go to use renamed config field
- [ ] Update cookie inventory in handler/auth.go

## WP-3: Client-side cleanup

- [ ] Remove localStorage caching in anonymous-session.ts

## WP-4: Documentation

- [ ] Create ADR-016
- [ ] Update ARCHITECTURE.md
- [ ] Update wiki/005-auth-session.md

## WP-5: Tests

- [ ] Update optional_auth_test.go
- [ ] Run full test suite, fix failures
