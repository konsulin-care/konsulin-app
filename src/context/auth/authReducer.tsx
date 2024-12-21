import { setCookies } from '@/app/actions'
import { deleteCookie } from 'cookies-next'
import { IActionAuth, IStateAuth } from './authTypes'

export const initialState: IStateAuth = {
  isAuthenticated: false,
  userInfo: {
    token: null,
    id: null,
    fullname: '',
    email: '',
    role_name: 'guest'
  }
}

const onLogin = async (formData: any) => {
  await setCookies('auth', formData)
}

export const reducer = (state: IStateAuth, action: IActionAuth): IStateAuth => {
  switch (action.type) {
    case 'login':
      // localStorage.setItem('auth', JSON.stringify(action.payload))
      onLogin(JSON.stringify(action.payload))
      return {
        ...state,
        isAuthenticated: !!(action.payload.token && action.payload.role_name),
        userInfo: {
          token: action.payload.token,
          role_name: action.payload.role_name,
          fullname: action.payload.fullname,
          id: action.payload.id,
          email: action.payload.email
        }
      }
    case 'auth-check':
      return {
        ...state,
        isAuthenticated: !!(action.payload.token && action.payload.role_name),
        userInfo: {
          token: action.payload.token,
          role_name: action.payload.role_name,
          fullname: action.payload.fullname,
          id: action.payload.id,
          email: action.payload.email
        }
      }
    case 'logout':
      deleteCookie('auth')
      localStorage.clear()
      return initialState

    default:
      return state
  }
}
