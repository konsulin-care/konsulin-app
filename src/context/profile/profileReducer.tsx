import { ActionProfile, StateProfile } from './profileTypes'

export const initialState: StateProfile = {
  fullname: '',
  email: '',
  birth_date: undefined,
  whatsapp_number: '',
  gender: '',
  address: '',
  education: ''
}

export const reducer = (
  state: StateProfile,
  action: ActionProfile
): StateProfile => {
  switch (action.type) {
    case 'updated':
      return {
        ...state,
        ...action.payload
      }
    default:
      return state
  }
}
