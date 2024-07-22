export interface StateProfile {
  profile: {
    fullname: string
    email: string
    birth_date: undefined | string
    whatsapp_number: string
    gender: string
    address: string
    education: string | string[]
  }
  pratice?: {}
}

export type ActionProfile =
  | { type: 'updated'; payload: StateProfile }
  | { type: 'getProfile'; payload: StateProfile }
