export interface IStateBooking {
  clinician_id?: string
  schedule_id?: string
  date?: string
  time?: string
  session_type?: 'online' | 'offline'
  number_of_sessions?: number
  price_per_session?: number
  problem_brief?: string
}

export type IActionBooking = IUpdateBookingInfo

export interface IUpdateBookingInfo {
  type: 'UPDATE_BOOKING_INFO'
  payload: IStateBooking
}
