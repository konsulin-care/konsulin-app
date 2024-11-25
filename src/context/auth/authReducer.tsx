import { setCookies } from '@/app/actions'
import { IActionAuth, IStateAuth } from './authTypes'

export const initialState: IStateAuth = {
  isAuthenticated: false,
  userInfo: {
    token: null,
    role_name: 'guest',
    name: null,
    id: null
  }
}

const onLogin = async (formData: any) => {
  await setCookies('auth', formData)
}

export const reducer = (state: IStateAuth, action: IActionAuth): IStateAuth => {
  switch (action.type) {
    case 'login':
      localStorage.setItem('auth', JSON.stringify(action.payload))
      onLogin(JSON.stringify(action.payload))
      return {
        ...state,
        isAuthenticated: !!(action.payload.token && action.payload.role_name),
        userInfo: {
          token: action.payload.token,
          role_name: action.payload.role_name,
          name: action.payload.name,
          id: action.payload.practitioner_id || action.payload.patient_id
        }
      }
    case 'logout':
      localStorage.clear()
      return initialState

    default:
      return state
  }
}
