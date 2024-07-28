import { ActionProfile, StateProfile } from './profileTypes'

export const initialState: StateProfile = {
  profile: {
    fullname: '',
    email: '',
    birth_date: undefined,
    whatsapp_number: '',
    gender: '',
    address: '',
    educations: []
  },
  pratice: {
    // Initialize practice state if necessary
  }
}

export const reducer = (
  state: StateProfile = initialState,
  action: ActionProfile
): StateProfile => {
  switch (action.type) {
    case 'updated':
      return {
        ...state,
        profile: {
          ...state.profile,
          ...action.payload.profile
        }
      }
    case 'getProfile':
      return {
        ...state,
        profile: {
          ...action.payload.profile
        }
      }
    default:
      return state
  }
}

export default reducer
