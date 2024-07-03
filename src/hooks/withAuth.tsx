import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface WithAuthProps {
  userRole: string
  isAuthenticated: boolean
}

const withAuth = (
  WrappedComponent: React.ComponentType<WithAuthProps>,
  allowedRoles: string[] = [],
  allowGuestMode: boolean = false
) => {
  const Wrapper: React.FC = props => {
    const [isVerified, setIsVerified] = useState(false)
    const [userRole, setuserRole] = useState(localStorage.getItem('userRole'))
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
      const token = localStorage.getItem('token')
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
        userRole={userRole || ''}
        isAuthenticated={!!localStorage.getItem('token')}
      />
    )
  }

  return Wrapper
}

export default withAuth
