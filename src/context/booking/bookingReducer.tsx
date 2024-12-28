import { IActionBooking, IStateBooking } from './bookingTypes'

export const initialState: IStateBooking = {
  clinician_id: null,
  schedule_id: null,
  date: null,
  time: null,
  session_type: 'offline',
  number_of_sessions: null,
  price_per_session: null,
  problem_brief: ''
}

export const reducer = (
  state: IStateBooking,
  action: IActionBooking
): IStateBooking => {
  switch (action.type) {
    case 'UPDATE_BOOKING_INFO':
      return {
        ...state,
        ...action.payload
      }
    default:
      return state
  }
}
