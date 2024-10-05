import { ActionProfile, StateProfile } from './profileTypes'

export const initialState: StateProfile = {
  profile: {
    fullname: '',
    email: '',
    birth_date: undefined,
    whatsapp_number: '',
    gender: '',
    address: '',
    educations: [],
    practice_informations: null,
    practice_availabilities: null,
    profile_picture: undefined
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
    case 'reset':
      return {
        ...state,
        profile: initialState.profile
      }
    default:
      return state
  }
}

export default reducer
