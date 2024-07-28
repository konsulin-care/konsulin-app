import { jwtDecode } from 'jwt-decode'

interface DecodedToken {
  expiry_time: number
}

export function decodeToken(token: string): {
  isExpired: boolean
  decoded?: DecodedToken
} {
  try {
    const decoded = jwtDecode<DecodedToken>(token)

    const expiryTimeInMilliseconds = decoded.expiry_time * 1000
    const currentTimeInMilliseconds = Date.now()

    const isExpired = expiryTimeInMilliseconds < currentTimeInMilliseconds
    return { isExpired, decoded }
  } catch (error) {
    console.error('Error decoding token', error)
    return { isExpired: true }
  }
}
