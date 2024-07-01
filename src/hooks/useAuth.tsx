import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface WithAuthProps {
  userRole?: 'patient' | 'clinician' | 'guest'
}

const withAuth = (
  WrappedComponent: React.ComponentType<WithAuthProps>,
  allowedRoles: string[] = []
) => {
  const Wrapper = (props: any) => {
    const [isVerified, setIsVerified] = useState(false)
    const [userRole, setUserRole] = useState<string | null>(null)

    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
      const token = localStorage.getItem('token')
      const role = localStorage.getItem('userRole')

      if (!token || !role || !allowedRoles.includes(role)) {
        router.push(`/login?redirect=${pathname}`)
      } else {
        setUserRole(role)
        setIsVerified(true)
      }
    }, [allowedRoles, pathname, router])

    if (!isVerified) {
      return <div>Loading...</div>
    }

    return <WrappedComponent {...props} userRole={userRole} />
  }

  return Wrapper
}

export default withAuth
