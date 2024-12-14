import { LoadingSpinnerIcon } from '@/components/icons'
import { useAuth } from '@/context/auth/authContext'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
export interface IWithAuth {
  userRole?: string
  isAuthenticated: boolean
}

function withAuth<T>(
  WrappedComponent: React.ComponentType<T>,
  allowedRoles: string[] = [],
  allowGuestMode: boolean = false
) {
  const Wrapper: React.FC = (props: T) => {
    const router = useRouter()
    const { state: authState } = useAuth()
    const [isVerified, setIsVerified] = useState(false)

    const token = authState.userInfo.token
    const role = authState.userInfo.role_name
    const pathname = usePathname()

    useEffect(() => {
      if (!token || !role) {
        if (allowGuestMode) {
          setIsVerified(true)
        } else {
          router.push(`/login?redirect=${pathname}`)
        }
      } else if (role && !allowedRoles.includes(role)) {
        router.push(`/unauthorized`)
      } else {
        setIsVerified(true)
      }
    }, [token, role, pathname, router])

    if (!isVerified) {
      return (
        <div className='flex min-h-screen min-w-full items-center justify-center'>
          <LoadingSpinnerIcon
            width={56}
            height={56}
            className='w-full animate-spin'
          />
        </div>
      )
    }

    return (
      <WrappedComponent
        {...props}
        userRole={allowGuestMode && !role ? 'guest' : role}
        isAuthenticated={authState.isAuthenticated}
      />
    )
  }

  return Wrapper
}

export default withAuth
