export interface PropsProfile {
  fullname: string
  email: string
  birth_date: undefined | string
  whatsapp_number: string
  gender: string
  address: string
  educations: string[]
  practice_informations?: Clinics
}

interface Clinic {
  clinic_id: string
  clinic_name: string
  affiliation: string
  price_per_session: PricePerSession
}

type Clinics = Clinic[]

interface PricePerSession {
  value: number
  currency: string
}
export interface StateProfile {
  profile: PropsProfile
}

export type ActionProfile =
  | { type: 'updated'; payload: StateProfile }
  | { type: 'getProfile'; payload: StateProfile }
