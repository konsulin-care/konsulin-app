import { SessionAuth } from 'supertokens-auth-react/recipe/session';
import { AccessDeniedScreen } from 'supertokens-auth-react/recipe/session/prebuiltui';
import { UserRoleClaim } from 'supertokens-auth-react/recipe/userroles';

/**
 * Route guard that renders children only when the session has the
 * Practitioner role. Shows AccessDeniedScreen otherwise.
 */
export function PractitionerRoute({
  children
}: Readonly<{ children: React.ReactNode }>) {
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
