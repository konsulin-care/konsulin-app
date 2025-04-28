import { deleteCookie } from 'cookies-next';
import { IStateAuth } from './authTypes';

export const initialState: IStateAuth = {
  isAuthenticated: false,
  userInfo: {
    token: null,
    id: null,
    fullname: '',
    email: '',
    role_name: 'guest'
  }
};

export const reducer = (state: IStateAuth, action: any): IStateAuth => {
  switch (action.type) {
    case 'login':
      return {
        ...state,
        // isAuthenticated: !!(action.payload.token && action.payload.role_name),
        // userInfo: action.payload
        isAuthenticated: action.doesSessionExist,
        userInfo: { ...action, role_name: 'patient' }
      };
    case 'auth-check':
      return {
        ...state,
        // isAuthenticated: !!(action.payload.token && action.payload.role_name),
        // userInfo: action.payload

        isAuthenticated: action.doesSessionExist,
        userInfo: { ...action, role_name: 'patient' }
      };
    case 'logout':
      deleteCookie('auth');
      localStorage.clear();
      return initialState;

    default:
      return state;
  }
};
