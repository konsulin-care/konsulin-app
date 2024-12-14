export interface IStateAuth {
  isAuthenticated: boolean
  userInfo: IStateUserInfo
}

export interface IStateUserInfo {
  token: string | null
  role_name: string | null
  name: string | null
  id: string | null
}

export interface IActionAuth {
  type: 'login' | 'logout' | 'loading' | 'auth-chech'
  payload?: any
}
