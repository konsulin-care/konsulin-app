import { useMutation, useQuery } from '@tanstack/react-query'
import { API } from '../api'

export const useGetAppointments = () => {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => API.get(`/api/v1/appointments`),
    select: response => {
      return response.data || null
    }
  })
}
export const useGetUpcomingAppointments = () => {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => API.get(`/api/v1/appointments/upcoming`),
    select: response => {
      return response.data || null
    }
  })
}

export interface ICreateAppointmentsPayload {
  clinician_id: string
  schedule_id: string
  date: string
  time: string
  session_type: string
  number_of_sessions: number
  price_per_session: number
  problem_brief: string
}

export const useCreateAppointments = ({
  clinician_id,
  schedule_id,
  date,
  time,
  session_type,
  number_of_sessions,
  price_per_session,
  problem_brief
}: ICreateAppointmentsPayload) => {
  return useMutation({
    mutationKey: ['create-appointments'],
    mutationFn: async () => {
      const response = await API.post('/api/v1/appointments', {
        clinician_id,
        schedule_id,
        date,
        time,
        session_type,
        number_of_sessions,
        price_per_session,
        problem_brief
      })
      return response.data
    }
  })
}
