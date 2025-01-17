import { toQueryString } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { API } from './api'

export const useFindAvailability = ({
  year,
  month,
  practitioner_role_id,
  ...rest
}) => {
  return useQuery({
    queryKey: ['find-availability', practitioner_role_id, month, year],
    queryFn: () =>
      API.get(
        `/api/v1/clinicians/availability?${toQueryString({ year, month, practitioner_role_id })}`
      ),
    enabled: rest?.enable,
    ...rest
  })
}
