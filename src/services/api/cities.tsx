import { useQuery } from '@tanstack/react-query'
import { API } from '../api'

export const useGetCities = () => {
  return useQuery({
    queryKey: ['cities'],
    queryFn: () => API.get(`/api/v1/cities`),
    select: response => {
      return response.data || null
    }
  })
}
