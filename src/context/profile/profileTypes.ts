export interface StateProfile {
  fullname: string
  email: string
  birth_date: undefined | string
  whatsapp_number: string
  gender: string
  address: string
  education: string | string[]
}

export type ActionProfile = { type: 'updated'; payload: StateProfile }
