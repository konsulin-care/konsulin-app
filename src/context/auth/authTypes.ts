// types.ts
export interface IStateAuth {
  token: string
  role_name: string
  name: string
}

export type IActionAuth = { type: 'login'; payload: IStateAuth } | { type: 'logout' }
