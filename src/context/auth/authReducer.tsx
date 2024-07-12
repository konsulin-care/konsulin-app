// reducer.ts
import { getFromLocalStorage } from '@/lib/utils'
import { IActionAuth, IStateAuth } from './authTypes'

let auth = getFromLocalStorage('auth')
const authInfoParser = () => {
  if (auth) {
    let { token, name, role_name } = JSON.parse(getFromLocalStorage('auth'))
    return { token, name, role_name }
  } else {
    return { token: null, name: null, role_name: null }
  }
}

export const initialState: IStateAuth = {
  token: authInfoParser().token,
  role_name: authInfoParser().role_name,
  name: authInfoParser().name
}

export const reducer = (state: IStateAuth, action: IActionAuth): IStateAuth => {
  switch (action.type) {
    case 'login':
      localStorage.setItem('auth', JSON.stringify(action.payload))

      return {
        token: action.payload.token,
        role_name: action.payload.role_name,
        name: action.payload.name
      }
    case 'logout':
      localStorage.clear()
      return {
        token: null,
        role_name: null,
        name: null
      }
  }
}
