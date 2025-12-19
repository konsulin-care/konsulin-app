import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { Roles } from '@/constants/roles';
import { getProfileByIdentifier } from '@/services/profile';
import { isProfileComplete } from '@/utils/profileCompleteness';

/**
 * Protected layout
 * - Cryptographically verifies SuperTokens access token
 * - Restricts JWT algorithms to prevent algorithm confusion
 * - Extracts userId from JWT `sub`
 * - Fetches profile from backend (trusted source)
 * - Enforces patient profile completeness
 */
export default async function ProtectedLayout({
  children
}: {
  children: ReactNode;
}) {
  /* -------------------------------------------------------------------------- */
  /* Read access token                                                          */
  /* -------------------------------------------------------------------------- */
  const cookieStore = cookies();
  const accessToken = cookieStore.get('sAccessToken')?.value;

  if (!accessToken) {
    redirect('/auth');
  }

  /* -------------------------------------------------------------------------- */
  /* Verify JWT + extract userId (SECURE)                                        */
  /* -------------------------------------------------------------------------- */
  const jwtPublicKey = process.env.SUPERTOKENS_JWT_PUBLIC_KEY;

  if (!jwtPublicKey) {
    console.error(
      '[ProtectedLayout] Missing SUPERTOKENS_JWT_PUBLIC_KEY env variable'
    );
    redirect('/auth');
  }

  let userId: string;

  try {
    const decoded = jwt.verify(accessToken, jwtPublicKey, {
      algorithms: ['RS256'] // 🔒 Prevent algorithm confusion attacks
    }) as jwt.JwtPayload;

    if (!decoded?.sub || typeof decoded.sub !== 'string') {
      throw new Error('Invalid JWT payload: missing sub');
    }

    userId = decoded.sub;
  } catch (error) {
    console.error('[ProtectedLayout] Invalid or expired session token', error);
    redirect('/auth');
  }

  /* -------------------------------------------------------------------------- */
  /* Fetch profile from backend (server-trusted source)                          */
  /* -------------------------------------------------------------------------- */
  let profile;

  try {
    profile = await getProfileByIdentifier({
      userId,
      type: Roles.Patient // backend safely decides actual role
    });
  } catch (error) {
    console.error('[ProtectedLayout] Failed to fetch profile', error);
    redirect('/auth');
  }

  /* -------------------------------------------------------------------------- */
  /* 🚨 Ensure profile exists and is Patient                                     */
  /* -------------------------------------------------------------------------- */
  if (!profile || profile.resourceType !== 'Patient') {
    console.error(
      '[ProtectedLayout] No Patient profile found for authenticated user'
    );
    redirect('/auth');
  }

  /* -------------------------------------------------------------------------- */
  /* Enforce profile completeness (PATIENT ONLY)                                 */
  /* -------------------------------------------------------------------------- */
  const email = profile.telecom?.find(t => t.system === 'email')?.value;

  if (!isProfileComplete(profile, email)) {
    redirect('/profile');
  }

  /* -------------------------------------------------------------------------- */
  /* Render protected content                                                    */
  /* -------------------------------------------------------------------------- */
  return <>{children}</>;
}
