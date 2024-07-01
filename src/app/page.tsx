'use client'

import withAuth from '@/hooks/useAuth'
import Link from 'next/link'

interface HomeProps {
  userRole: string
  isAuthenticated: boolean
}

const Home: React.FC<HomeProps> = ({ userRole, isAuthenticated }) => {
  return (
    <div>
      <h1>Home Page</h1>

      {!isAuthenticated ? (
        <Link href='/login'>
          <button>Login</button>
        </Link>
      ) : (
        <Link href='/logout'>
          <button>Logout</button>
        </Link>
      )}

      {renderHomeContent(userRole)}
    </div>
  )
}

function renderHomeContent(userRole: string) {
  switch (userRole) {
    case 'guest':
      return <p>Welcome, guest! You have limited access to the dashboard.</p>
    case 'patient':
      return <p>Halo patient, ini tampilan khusus untuk patient! .</p>
    case 'clinician':
      return <p>Halo clinician, ini tampilan khusus untuk clinician.</p>
    default:
      return <p>Welcome! Please login to access more features.</p>
  }
}

export default withAuth(Home, ['patient', 'clinician'], true)
