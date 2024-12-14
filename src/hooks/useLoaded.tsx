import { useEffect, useState } from 'react'

export default function useLoaded() {
  const [isLoaded, setIsLoaded] = useState(false)
  useEffect(() => setIsLoaded(true), [])

  return { isLoaded }
}
