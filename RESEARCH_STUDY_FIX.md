# Research Study Fallback Fix

## Summary

Fixed the research study fallback mechanism that was incorrectly displaying outdated studies from previous survey periods. The application now correctly handles the absence of current or future research studies by showing a clean UI without the research section.

## Changes Made

### 1. API Hook (`src/services/api/assessment.tsx`)

**Removed:** The fallback logic that would fetch all active research studies when no ongoing studies were found.

**Before:**

```typescript
if (!hasResearch(response.data)) {
  const fallbackResponse = await API.get(
    `/fhir/ResearchStudy?status=active&_include=ResearchStudy:protocol`
  );
  return fallbackResponse.data;
}
```

**After:**

```typescript
// Return the response as-is - do not fall back to previous survey periods
// This ensures only current and future research studies are displayed
return response.data;
```

### 2. UI Component (`src/app/assessments/page.tsx`)

**Updated:** The research section rendering logic to conditionally display only when studies exist.

**Before:**

```typescript
{researchLoading || isAuthLoading ? (
  <CardLoader item={2} />
) : (
  filteredResearch(research).length > 0 && (
    // Research section content
  )
)}
```

**After:**

```typescript
{researchLoading || isAuthLoading ? (
  <CardLoader item={2} />
) : filteredResearch(research).length > 0 ? (
  <div>
    {/* Research section content */}
  </div>
) : null}
```

This change ensures that when there are no ongoing or upcoming research studies, the entire "On-going Research" section is gracefully hidden instead of showing outdated information.

### 3. Test Suite (`src/services/api/__tests__/assessment.test.tsx`)

Created comprehensive test coverage for the `useOngoingResearch` hook with the following test cases:

1. **Ongoing Research Studies** - Verifies correct behavior when current studies exist
2. **Upcoming Research Studies** - Verifies behavior when only future studies exist
3. **No Research Studies** - Verifies empty array is returned when no studies exist
4. **No Fallback to Previous Periods** - Ensures the hook doesn't make additional API calls without date filters
5. **Multiple Research Studies** - Tests handling of multiple studies with different questionnaires
6. **Studies Without Questionnaires** - Tests edge case of studies without linked questionnaires

All tests verify that:

- Only one API call is made (no fallback)
- The date filter (`date=ge{today}`) is always applied
- Only current and future studies are returned

### 4. Test Configuration

Added test infrastructure:

- `vitest.config.ts` - Vitest configuration with React plugin and jsdom environment
- `src/__tests__/setup.ts` - Test setup file for Testing Library
- Updated `package.json` with test scripts:
  - `npm test` - Run tests in watch mode
  - `npm run test:run` - Run tests once
  - Added `@vitejs/plugin-react` to dev dependencies

## Behavior Changes

### Before

- When no ongoing research studies existed, the app would fall back to showing studies from previous survey periods
- This resulted in outdated/inactive studies being displayed as if they were still active
- Users could potentially join studies that had already ended

### After

- Only research studies with start dates >= today are displayed
- When no ongoing or upcoming studies exist, the research section is completely hidden
- Users see only relevant, current studies
- No outdated information is displayed

## Testing

Run tests with:

```bash
npm run test:run
```

All tests should pass (6 test cases).

## Notes

- The date comparison uses `date-fns` format `yyyy-MM-dd` for consistent timezone handling
- The hook uses TanStack Query for caching and refetching
- The UI gracefully handles loading, empty, and populated states
- The change maintains backward compatibility with existing behavior when valid studies exist
