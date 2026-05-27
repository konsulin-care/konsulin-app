'use server';

import { cookies } from 'next/headers';
import { createHmac } from 'node:crypto';

/** Signs a cookie value using HMAC-SHA256. Returns `base64url(value).base64url(hmac)`. */
function signCookieValue(value: string, secret: string): string {
  const enc = Buffer.from(value).toString('base64url');
  const mac = createHmac('sha256', secret).update(enc).digest('base64url');
  return `${enc}.${mac}`;
}

/** Sets a signed session cookie. Falls back to unsigned with a warning if SESSION_COOKIE_SECRET is not set. */
export async function setCookies(
  sessionName: string,
  sessionData: string
): Promise<void> {
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret) {
    console.warn('SESSION_COOKIE_SECRET not set; cookie will not be signed');
    await cookies().set(sessionName, sessionData, {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 2, // 2 hours
      path: '/'
    });
    return;
  }
  const signed = signCookieValue(sessionData, secret);
  await cookies().set(sessionName, signed, {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 2,
    path: '/'
  });
}
