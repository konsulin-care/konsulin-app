export interface IStateBooking {
  date?: Date
  time?: string

  detailClinicianByClinicianID?: {
    clinician_id: string
    practice_information: {
      affiliation: string
      specialties: string[]
      price_per_session: {
        value: number
        currency: string
      }
    }
    schedule_id: string
    practitioner_role_id: string
  }
}

export type IActionBooking = IUpdateBookingInfo

export interface IUpdateBookingInfo {
  type: 'UPDATE_BOOKING_INFO'
  payload: IStateBooking
}
