import { addDays } from 'date-fns'
import { IActionBooking, IStateBooking } from './bookingTypes'

const today = new Date()
today.setHours(0, 0, 0, 0)

export const initialState: IStateBooking = {
  date: addDays(today, 1),
  time: null,
  detailClinicianByClinicianID: null
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
