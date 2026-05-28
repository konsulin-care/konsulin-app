'use server';

import { cookies } from 'next/headers';

/** Sets a session cookie. Next.js internally handles URI-encoding of cookie values. */
export async function setCookies(
  sessionName: string,
  sessionData: string
): Promise<void> {
  await cookies().set(sessionName, sessionData, {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 2,
    path: '/'
  });
}
