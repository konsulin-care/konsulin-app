export interface IStateBooking {
  date?: Date;
  startTime?: string;
  endTime?: string;
  hasUserChosenDate?: boolean;
  isBookingSubmitted?: boolean;

  detailClinicianByClinicianID?: {
    clinician_id: string;
    practice_information: {
      affiliation: string;
      specialties: string[];
      price_per_session: {
        value: number;
        currency: string;
      };
    };
    schedule_id: string;
    practitioner_role_id: string;
  };
}

export type IActionBooking = IUpdateBookingInfo | IResetBookingInfo;

export interface IUpdateBookingInfo {
  type: 'UPDATE_BOOKING_INFO';
  payload: IStateBooking;
}

type IResetBookingInfo = {
  type: 'RESET_BOOKING_INFO';
};
