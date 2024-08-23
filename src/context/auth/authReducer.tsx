import { getFromLocalStorage } from '@/lib/utils'
import { IActionAuth, IStateAuth } from './authTypes'

const authInfoParser = () => {
  const auth = getFromLocalStorage('auth')
  if (auth) {
    const parsedAuth = JSON.parse(auth)
    const { token, name, role_name, practitioner_id, patient_id } = parsedAuth

    return {
      token,
      name,
      role_name,
      id: practitioner_id || patient_id
    }
  } else {
    return {
      token: null,
      name: null,
      role_name: null,
      id: null
    }
  }
}

const parsedAuth = authInfoParser()

export const initialState: IStateAuth = {
  token: parsedAuth.token,
  role_name: parsedAuth.role_name,
  name: parsedAuth.name,
  id: parsedAuth.id
}

export const reducer = (state: IStateAuth, action: IActionAuth): IStateAuth => {
  switch (action.type) {
    case 'login':
      localStorage.setItem('auth', JSON.stringify(action.payload))
      return {
        token: action.payload.token,
        role_name: action.payload.role_name,
        name: action.payload.name,
        id: action.payload.practitioner_id || action.payload.patient_id
      }
    case 'logout':
      localStorage.clear()
      return {
        token: null,
        role_name: null,
        name: null,
        id: null
      }
    default:
      return state
  }
}
