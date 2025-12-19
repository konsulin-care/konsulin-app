import { Roles } from '@/constants/roles';
import { getProfileByIdentifier } from '@/services/profile';
import { isProfileComplete } from '@/utils/profileCompleteness';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getClaimValue, getUserId } from 'supertokens-web-js/recipe/session';
import { UserRoleClaim } from 'supertokens-web-js/recipe/userroles';

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  /* ---------------------------------------------------------------------- */
  /* Session existence check (do NOT parse client auth cookie)               */
  /* ---------------------------------------------------------------------- */
  const cookieStore = cookies();
  const hasSession = cookieStore.get('sAccessToken');

  if (!hasSession) {
    redirect('/auth');
  }

  /* ---------------------------------------------------------------------- */
  /* Role comes from SuperTokens signed claim                                 */
  /* ---------------------------------------------------------------------- */
  const roles = (await getClaimValue({ claim: UserRoleClaim })) ?? [];
  const role = roles.includes(Roles.Practitioner)
    ? Roles.Practitioner
    : Roles.Patient;

  /* ---------------------------------------------------------------------- */
  /* Fetch profile from backend (server-trusted source)                      */
  /* ---------------------------------------------------------------------- */

  const userId = await getUserId();

  if (!userId) {
    redirect('/auth');
  }

  const profile = await getProfileByIdentifier({
    userId,
    type: role
  });

  /* ---------------------------------------------------------------------- */
  /* Enforce profile completeness — PATIENT ONLY                             */
  /* ---------------------------------------------------------------------- */
  if (role === Roles.Patient) {
    // Runtime type narrowing for FHIR safety
    if (!profile || profile.resourceType !== 'Patient') {
      redirect('/profile');
    }

    const email = profile.telecom?.find(t => t.system === 'email')?.value ?? '';

    if (!isProfileComplete(profile, email)) {
      redirect('/profile');
    }
  }

  return <>{children}</>;
}
