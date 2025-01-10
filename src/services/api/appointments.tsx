import { IStateBooking } from '@/context/booking/bookingTypes'
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

export const useCreateAppointments = ({
  clinician_id,
  schedule_id,
  date,
  time,
  session_type,
  number_of_sessions,
  price_per_session,
  problem_brief
}: IStateBooking) => {
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
