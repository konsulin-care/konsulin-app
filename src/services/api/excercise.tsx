import { API } from '@/services/api'

export const getExceriseList = async () => {
  const response = await API.get(
    'https://my-json-server.typicode.com/konsulin-id/exercise/exercise'
  )
  return response.data
}
