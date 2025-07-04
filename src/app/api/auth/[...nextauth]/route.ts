import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
// import { setCookies } from '@/app/actions'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL!

interface LoginResponse {
  success: boolean
  message: string
  data: {
    token: string
    user: {
      fullname: string
      email: string
      user_id: string
      role_id: string
      role_name: string
      practitioner_id?: string
      patient_id?: string
    }
  }
}

// const setLoginInfoToCookies = async (formData: any) => {
//   await setCookies('auth', formData)
// }

const authOption: NextAuthOptions = {
  session: {
    strategy: 'jwt'
  },
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile'
        }
      }
    })
  ],
  callbacks: {
    async signIn({ account, profile }) {
      console.log('Account:', account)
      console.log('Profile:', profile)

      if (!account?.access_token || !profile?.email) {
        console.error('Sign-in error: Missing account or profile information.')
        return false // Deny sign-in
      }

      /* TODO: Exchange Token from BE */

      // try {
      //   const res = await fetch(`${BACKEND_API_URL}/api/v1/auth/login/clinician`, {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },

      /* TODO: Change payload depend API later */

      //     body: JSON.stringify({
      //       username: 'haryclinician1',
      //       password: 'Test1234!',
      //     }),
      //   });

      //   const response: LoginResponse = await res.json();

      //   if (!response.success) {
      //     console.error('API login failed:', response.message);
      //     return false;
      //   }

      //   const payload = {
      //     token: response.data.token,
      //     role_name: response.data.user.role_name,
      //     fullname: response.data.user.fullname,
      //     email: response.data.user.email,
      //     id: response.data.user.user_id,
      //   };

      //   await setLoginInfoToCookies(JSON.stringify(payload))
      return true
      // } catch (error) {
      //   console.error('Error during sign-in process:', error);
      //   return false;
      // }
    }
  }
}

const handler = NextAuth(authOption)
export { handler as GET, handler as POST }
