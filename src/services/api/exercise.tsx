import { API } from '@/services/api'
import { useQuery } from '@tanstack/react-query'

export const useGetExcerise = () => {
  return useQuery({
    queryKey: ['exercise'],
    queryFn: () =>
      API.get(
        'https://my-json-server.typicode.com/konsulin-id/exercise/exercise'
      )
  })
}
