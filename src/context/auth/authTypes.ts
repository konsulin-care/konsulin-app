export interface IStateAuth {
  isAuthenticated: boolean
  userInfo: IStateUserInfo
}

export interface IStateUserInfo {
  token?: string
  role_name?: string
  fullname?: string
  id?: string
  email?: string
}

export type IActionAuth = IActionLogin | IActionLogout

export interface IActionLogin {
  type: 'login' | 'auth-check'
  payload: {
    token: string
    role_name: string
    fullname: string
    id: string
    email: string
  }
}

export interface IActionLogout {
  type: 'logout'
}
