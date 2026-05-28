# TODO

## WP-1: Create src/lib/indexeddb.ts

- [x] Create `src/lib/indexeddb.ts` with `openDB()`, `getStore()`, CRUD helpers, `migrateLocalStorage()`, `clearUserData()`

## WP-2: Merge intent-storage.ts into redirect-intent.ts

- [x] Extend `redirect-intent.ts` with `saveIntent()`, `getIntent()`, `clearIntent()` via cookie
- [x] Delete `intent-storage.ts`
- [x] Update `page.tsx` to use `getRedirectIntent()`/`clearRedirectIntent()` instead of localStorage `redirect`

## WP-3: Guest session migration

- [x] Update `anonymous-session.ts` — `cacheGuestId()` and `getCachedGuestId()` use IndexedDB `guest_sessions` store

## WP-4: UI preferences migration

- [x] Update `record-assessment.tsx` — `result-table-colors` via IndexedDB `ui_preferences`
- [x] Update `clinic/page.tsx` — `selected_clinic` via IndexedDB `ui_preferences`
- [x] Update `clinic/[clinicId]/page.tsx` — `selected_practitioner` via IndexedDB `ui_preferences`
- [x] Update `practitioner/[practitionerId]/page.tsx` — reads via IndexedDB `ui_preferences`
- [x] Update `frontendConfig.ts` — `skip-response-cleanup` via IndexedDB `ui_preferences`
- [x] Update `route-response-cleaner.tsx` — `skip-response-cleanup` read via IndexedDB

## WP-5: Form drafts migration

- [x] Update `fhir-forms-renderer.tsx` — `response_{qId}` via IndexedDB `assessment_drafts`
- [x] Update `soap-form.tsx` — `soap_{patientId}` via IndexedDB `soap_drafts`
- [x] Update `assessment.tsx` — `response_{qId}` delete via IndexedDB
- [x] Update `route-response-cleaner.tsx` — cursor iteration over `assessment_drafts` and `soap_drafts`

## WP-6: Service requests & temp booking

- [x] Update `record-assessment.tsx` — `serviceRequest_{id}` via IndexedDB `service_requests`
- [x] Update `fhir-forms-renderer.tsx` — `serviceRequest_{id}` write via IndexedDB
- [x] Update `practitioner-availability.tsx` — `temp-booking` via IndexedDB `temp_booking`

## WP-7: Scoped localStorage.clear() replacement

- [x] Update `authReducer.tsx` — replace `localStorage.clear()` with `clearUserData()`
- [x] Update `api.tsx` — replace `localStorage.clear()` with `clearUserData()`

## WP-8: Migration trigger

- [x] Run `migrateLocalStorage()` once in `authContext.tsx` on mount
