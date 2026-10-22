# Frontend Auth Guards

## Two-Layer Model

Auth enforcement happens at two layers:

1. **Go BFF** — Route-level guard with `authGuard` + `roleGuard("Practitioner")` in `cmd/konsulin-app/main.go`. Catches requests before they reach Next.js.
2. **React** — Component-level guard inside page components for instant UI feedback and offline scenarios.

## Canonical React Pattern

Use `<SessionAuth>` with claim validators. Create a named route component per role:

```tsx
// src/components/auth/practitioner-route.tsx
import { SessionAuth } from 'supertokens-auth-react/recipe/session';
import { UserRoleClaim } from 'supertokens-auth-react/recipe/userroles';
import { AccessDeniedScreen } from 'supertokens-auth-react/recipe/session/prebuiltui';

export function PractitionerRoute({ children }) {
  return (
    <SessionAuth
      accessDeniedScreen={AccessDeniedScreen}
      overrideGlobalClaimValidators={globalValidators => [
        ...globalValidators,
        UserRoleClaim.validators.includes('Practitioner')
      ]}
    >
      {children}
    </SessionAuth>
  );
}
```

Apply as a wrapper around page content in the page component's JSX.

## Deprecated

`withAuth` HOC (`src/hooks/withAuth.tsx`) is deprecated. Use `<SessionAuth>` pattern instead.
