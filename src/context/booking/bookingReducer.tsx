import { addDays } from 'date-fns';
import { IActionBooking, IStateBooking } from './bookingTypes';

const today = new Date();
today.setHours(0, 0, 0, 0);

export const initialState: IStateBooking = {
  date: addDays(today, 1),
  startTime: null,
  hasUserChosenDate: false,
  isBookingSubmitted: false
};

export const reducer = (
  state: IStateBooking,
  action: IActionBooking
): IStateBooking => {
  switch (action.type) {
    case 'UPDATE_BOOKING_INFO':
      return {
        ...state,
        ...action.payload
      };
    case 'RESET_BOOKING_INFO':
      return initialState;
    default:
      return state;
  }
};
