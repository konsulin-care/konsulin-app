export interface PropsProfile {
  fullname: string
  email: string
  birth_date: undefined | string
  whatsapp_number: string
  gender: string
  address: string
  educations: string[]
}
export interface StateProfile {
  profile: PropsProfile
  pratice?: {}
}

export type ActionProfile =
  | { type: 'updated'; payload: StateProfile }
  | { type: 'getProfile'; payload: StateProfile }
