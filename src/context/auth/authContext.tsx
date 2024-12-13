'use client'

import { getCookie } from 'cookies-next'
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState
} from 'react'
import { initialState, reducer } from './authReducer'
import { IActionAuth, IStateAuth } from './authTypes'

interface ContextProps {
  isLoading: boolean
  state: IStateAuth
  dispatch: React.Dispatch<IActionAuth>
}

const AuthContext = createContext<ContextProps | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setisLoading] = useState(true)
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const auth = JSON.parse(decodeURI(getCookie('auth') || '[]'))

    const payload = {
      token: auth.token,
      role_name: auth.role_name || 'guest',
      name: auth.name,
      id: auth.practitioner_id || auth.patient_id
    }

    dispatch({
      type: 'auth-chech',
      payload
    })

    setisLoading(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isLoading, state, dispatch }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): ContextProps => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within a AuthProvider')
  }

  return context
}
