'use server';

import { createHmac } from 'crypto';
import { cookies } from 'next/headers';

function signCookieValue(value: string, secret: string): string {
  const enc = Buffer.from(value).toString('base64url');
  const mac = createHmac('sha256', secret).update(enc).digest('base64url');
  return `${enc}.${mac}`;
}

export async function setCookies(
  sessionName: string,
  sessionData: string
): Promise<void> {
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret) {
    console.warn('SESSION_COOKIE_SECRET not set; cookie will not be signed');
    cookies().set(sessionName, sessionData, {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 2, // 2 hours
      path: '/'
    });
    return;
  }
  const signed = signCookieValue(sessionData, secret);
  cookies().set(sessionName, signed, {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 2,
    path: '/'
  });
}
