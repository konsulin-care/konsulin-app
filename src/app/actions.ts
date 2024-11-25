'use server'

import { cookies } from 'next/headers'

export async function setCookies(sessionName, sessionData) {
  const encryptedSessionData = sessionData // Encrypt your session data
  cookies().set(sessionName, encryptedSessionData, {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // One week
    path: '/'
  })
}
