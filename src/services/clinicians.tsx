import { toQueryString } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { API } from './api'

const currentDate = new Date()
const currentYear = currentDate.getFullYear()

export const useFindAvailability = ({
  year = currentYear,
  month = 1,
  practitioner_role_id
}) => {
  return useQuery({
    queryKey: ['find-availability'],
    queryFn: () =>
      API.get(
        `/api/v1/clinicians/availability?${toQueryString({ year, month, practitioner_role_id })}`
      ),
    enabled: !!practitioner_role_id
  })
}
