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
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
      const token = localStorage.getItem('token')
      const userRole = localStorage.getItem('userRole')

      if (!token || !userRole) {
        if (allowGuestMode) {
          setIsVerified(true)
        } else {
          router.push(`/login?redirect=${pathname}`)
        }
      } else if (userRole && !allowedRoles.includes(userRole)) {
        router.push(`/unauthorized`)
      } else {
        setIsVerified(true)
      }
    }, [allowGuestMode, allowedRoles, pathname, router])

    if (!isVerified) {
      return <div>Loading...</div>
    }

    return (
      <WrappedComponent
        {...props}
        userRole={localStorage.getItem('userRole') || ''}
        isAuthenticated={!!localStorage.getItem('token')}
      />
    )
  }

  return Wrapper
}

export default withAuth
