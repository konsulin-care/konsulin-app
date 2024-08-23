export interface IStateAuth {
  token: string | null
  role_name: string | null
  name: string | null
  id: string | null
}

export interface IActionAuth {
  type: 'login' | 'logout'
  payload?: {
    token: string
    name: string
    role_name: string
    practitioner_id?: string
    patient_id?: string
  }
}
