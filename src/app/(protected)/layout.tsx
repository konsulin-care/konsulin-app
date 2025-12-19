import { Roles } from '@/constants/roles';
import { getProfileByIdentifier } from '@/services/profile';
import { isProfileComplete } from '@/utils/profileCompleteness';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type AuthCookie = {
  userId?: string;
  role_name?: string;
};

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const rawAuth = cookieStore.get('auth')?.value;

  if (!rawAuth) {
    redirect('/auth');
  }

  let auth: AuthCookie;

  try {
    auth = JSON.parse(decodeURIComponent(rawAuth));
  } catch {
    redirect('/auth');
  }

  if (!auth.userId || !auth.role_name) {
    redirect('/auth');
  }

  if (auth.role_name === Roles.Patient) {
    const profile = await getProfileByIdentifier({
      userId: auth.userId,
      type: Roles.Patient
    });

    if (!profile || !isProfileComplete(profile)) {
      redirect('/profile');
    }
  }

  return <>{children}</>;
}
