import { getFromLocalStorage } from '@/lib/utils'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export interface IWithAuth {
  userRole?: string
  isAuthenticated: boolean
}

const withAuth = (
  WrappedComponent: React.ComponentType<IWithAuth>,
  allowedRoles: string[] = [],
  allowGuestMode: boolean = false
) => {
  const Wrapper: React.FC = props => {
    const [isVerified, setIsVerified] = useState(false)
    const [userRole, setuserRole] = useState(getFromLocalStorage('userRole'))
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
      const token = getFromLocalStorage('token')
      const role = userRole

      if (!token || !role) {
        if (allowGuestMode) {
          setuserRole('guest')
          setIsVerified(true)
        } else {
          router.push(`/login?redirect=${pathname}`)
        }
      } else if (role && !allowedRoles.includes(role)) {
        router.push(`/unauthorized`)
      } else {
        setIsVerified(true)
      }
    }, [])

    if (!isVerified) {
      return <div>Loading...</div>
    }

    return (
      <WrappedComponent
        {...props}
        userRole={userRole}
        isAuthenticated={!!getFromLocalStorage('token')}
      />
    )
  }

  return Wrapper
}

export default withAuth
