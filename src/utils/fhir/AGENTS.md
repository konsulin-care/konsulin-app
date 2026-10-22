# FHIR R4 Extension Utilities

## DRY Decision

All custom Konsulin FHIR extensions and code systems are built through a shared,
centralized layer instead of per-module URL strings and ad-hoc construction.

### Centralized URL maps — `extensions.ts`

- `FhirExtensionUrls` — every custom `StructureDefinition` extension URL
  (`fee`, `serviceDuration`, `questionnaireEstimatedDuration`, `locationImage`,
  `questionnaireImage`).
- `FhirSystems` — every FHIR code system / terminology URL
  (`assessmentDomain`, `assessmentContext`, `usageContext`, `lucide`, `ucum`).

Never hardcode a URL literal. Always import from `extensions.ts`.

### Generic primitives — `extensions.ts`

- `upsertExtension(resource, extension)` — add or replace an extension by URL,
  preserving unrelated extensions. Returns a new resource (immutable).
- `getExtension(resource, url)` — find an extension by URL.

### Fee logic — `fee.ts`

The fee extension is shared by `HealthcareService` and `Questionnaire`. All fee
construction and reading goes through `fee.ts`:

- `buildFeeExtension(value)` / `setFee(resource, value)` / `getFee(resource)`
- `getFeeFromHealthcareService(hs)` — thin type-specific alias
- `formatFee(fee)` — IDR display formatting

Do not build fee extensions inline elsewhere.

## Convention: thin immutable wrappers

Each concern gets a small module in `src/utils/fhir/` exposing typed
`get<Concern>` / `set<Concern>` functions that delegate to the primitives.

Examples: `duration.ts`, `location-image.ts`, `questionnaire-image.ts`,
`questionnaire-category.ts`, `questionnaire-icon.ts`.

Wrappers must:

- Return a new resource; never mutate the input.
- Preserve unrelated extensions (delegate to `upsertExtension`).
- Have JSDoc on every exported function.
- Stay under 300 lines.

## Adding a new extension

1. Register the URL in `FhirExtensionUrls` (or `FhirSystems` for a system).
2. Create a thin module with `set<Concern>` / `get<Concern>` delegating to the
   primitives.
3. Write tests covering set / replace / preserve-others branches.
4. Import the URL in tests too — no literals anywhere.

## ESLint

`http://` URLs are intentional (Konsulin FHIR server). The
`unicorn/prefer-https` rule is disabled with block-level comments around the URL
maps in `extensions.ts` — do not add per-line disables.
