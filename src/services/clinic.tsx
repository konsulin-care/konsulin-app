import { toQueryString } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { API } from './api'

export type IUseClinicParams = {
  page?: number
  pageSize?: number
  name?: string
  start_date?: Date
  end_date?: Date
  start_time?: string
  end_time?: string
  location?: string
}

export const useClinicFindAll = (
  params: IUseClinicParams,
  clinicId?: string,
  delay: number = 500
) => {
  const [debouncedParams, setDebouncedParams] =
    useState<IUseClinicParams>(params)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedParams(params)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [params, delay])

  return useQuery({
    queryKey: ['clinic', debouncedParams],
    queryFn: () =>
      API.get(
        `/api/v1/clinics${!clinicId ? '' : `/${clinicId}/clinicians`}?${toQueryString(params)}`
      )
  })
}

export const useClinicFindByID = (clinicId: number | string) => {
  return useQuery({
    queryKey: ['detail-clinic', clinicId],
    queryFn: () => API.get(`/api/v1/clinics/${clinicId}`)
  })
}

export const useDetailClinicianByClinic = ({ clinician_id, clinic_id }) => {
  return useQuery({
    queryKey: ['detail-clinician-by-clinic', clinic_id],
    queryFn: () =>
      API.get(`/api/v1/clinics/${clinic_id}/clinicians/${clinician_id}`)
  })
}
