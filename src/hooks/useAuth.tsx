import { usePathname, useRouter } from 'next/navigation'

import { useEffect } from 'react'

const withAuth = (
  WrappedComponent: React.ComponentType<any>,
  allowedRoles: string[] = []
) => {
  const Wrapper = (props: any) => {
    const router = useRouter()
    const pathname = usePathname()

    const token = localStorage.getItem('token')
    const userRole = localStorage.getItem('userRole')

    useEffect(() => {
      if (!token || !userRole || !allowedRoles.includes(userRole)) {
        router.push(`/login?redirect=${pathname}`)
      }
    }, [])

    return <WrappedComponent {...props} userRole={userRole} />
  }

  return Wrapper
}

export default withAuth
