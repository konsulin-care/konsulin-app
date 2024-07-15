'use client'

import { useAuth } from '@/context/auth/authContext'
import { useRouter } from 'next/navigation'

export default function Logout() {
  const { dispatch } = useAuth()
  const router = useRouter()
  dispatch({ type: 'logout' })
  router.push('/')
}
