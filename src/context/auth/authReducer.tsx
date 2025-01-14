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

export const reducer = (state: IStateAuth, action: IActionAuth): IStateAuth => {
  switch (action.type) {
    case 'login':
      return {
        ...state,
        isAuthenticated: !!(action.payload.token && action.payload.role_name),
        userInfo: action.payload
      }
    case 'auth-check':
      return {
        ...state,
        isAuthenticated: !!(action.payload.token && action.payload.role_name),
        userInfo: action.payload
      }
    case 'logout':
      deleteCookie('auth')
      localStorage.clear()
      return initialState

    default:
      return state
  }
}
