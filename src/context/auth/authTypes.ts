export interface IStateAuth {
  isAuthenticated: boolean;
  userInfo: IStateUserInfo;
}

export interface IStateUserInfo {
  role_name?: string;
  fullname?: string;
  userId?: string;
  email?: string;
  profile_picture?: string;
  fhirId?: string;
}

export type IActionAuth = IActionLogin | IActionLogout;

export interface IActionLogin {
  type: 'login' | 'auth-check';
  payload: IStateUserInfo;
}

export interface IActionLogout {
  type: 'logout';
}
