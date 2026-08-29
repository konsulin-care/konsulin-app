'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import CreateJournal from '@/components/journal/create';
import PageHeader from '@/components/page-header';
import { Roles } from '@/constants/roles';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import Session from 'supertokens-auth-react/recipe/session';
import { UserRoleClaim } from 'supertokens-web-js/recipe/userroles';

/** Parse raw UserRoleClaim value into a string array of role names. */
function parseRoles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const roles: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') roles.push(item);
  }
  return roles;
}

/**
 * Patient-only journal entry page. Redirects non-Patient roles to /.
 * Uses Session.useClaimValue to verify the Patient role claim.
 */
export default function Journal() {
  const router = useRouter();
  const claimValue = Session.useClaimValue(UserRoleClaim);
  const raw = claimValue as { loading: boolean; value: string[] | undefined };
  const roles = useMemo(() => parseRoles(raw.value), [raw.value]);
  const loading = raw.loading;

  useEffect(() => {
    if (loading) return;
    if (!roles.includes(Roles.Patient)) {
      router.replace('/');
    }
  }, [loading, roles, router]);

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <LoadingSpinnerIcon width={56} height={56} className='animate-spin' />
      </div>
    );
  }

  if (!roles.includes(Roles.Patient)) return null;

  return (
    <>
      <PageHeader />
      <CreateJournal />
    </>
  );
}
