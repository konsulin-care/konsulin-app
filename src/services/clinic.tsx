import { getDaysInRange, toQueryString } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { API } from './api'

export type IUseClinicParams = {
  page?: number
  pageSize?: number
  start_date?: Date
  end_date?: Date
  start_time?: string
  end_time?: string
  location?: string
  days?: String[]
}

export const useClinicFindAll = (
  {
    keyword,
    filter,
    clinicId
  }: { keyword?: string; filter?: IUseClinicParams; clinicId?: string },
  delay: number = 500
) => {
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>(keyword)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(keyword)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [keyword, delay])

  const payload = {
    name: debouncedKeyword,
    page: filter.page,
    pageSize: filter.pageSize,
    start_time: filter.start_time,
    end_time: filter.end_time,
    location: filter.location,
    days: getDaysInRange(filter.start_date, filter.end_date)
  }

  return useQuery({
    queryKey: ['clinic', payload],
    queryFn: () =>
      API.get(
        `/api/v1/clinics${!clinicId ? '' : `/${clinicId}/clinicians`}?${toQueryString(payload)}`
      )
  })
}

export const useClinicFindByID = (clinicId: number | string) => {
  return useQuery({
    queryKey: ['detail-clinic', clinicId],
    queryFn: () => API.get(`/api/v1/clinics/${clinicId}`)
  })
}

export const useDetailClinicianByClinic = ({
  clinician_id,
  clinic_id,
  ...rest
}) => {
  return useQuery({
    queryKey: ['detail-clinician-by-clinic', clinic_id],
    queryFn: () =>
      API.get(`/api/v1/clinics/${clinic_id}/clinicians/${clinician_id}`),
    select: response => response.data,
    enabled: rest?.enable,
    ...rest
  })
}
