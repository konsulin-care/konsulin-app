import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { Roles } from '@/constants/roles';
import { getProfileByIdentifier } from '@/services/profile';
import { isProfileComplete } from '@/utils/profileCompleteness';

export default async function ProtectedLayout({
  children
}: {
  children: ReactNode;
}) {
  const cookieStore = cookies();

  const accessToken = cookieStore.get('sAccessToken');
  const userId = cookieStore.get('userId');

  if (!accessToken || !userId) {
    redirect('/auth');
  }

  let profile;

  try {
    profile = await getProfileByIdentifier({
      userId: userId.value,
      type: Roles.Patient
    });
  } catch {
    redirect('/auth');
  }

  if (profile?.resourceType === 'Patient' && !isProfileComplete(profile)) {
    redirect('/profile');
  }

  return <>{children}</>;
}
