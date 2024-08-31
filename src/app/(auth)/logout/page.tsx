'use client'

import { useAuth } from '@/context/auth/authContext'
import { useProfile } from '@/context/profile/profileContext'
import { useRouter } from 'next/navigation'

export default function Logout() {
  const { dispatch } = useAuth()
  const { dispatch: dispatchProfile } = useProfile()
  const router = useRouter()
  dispatch({ type: 'logout' })
  dispatchProfile({ type: 'reset' })
  router.push('/')
}
