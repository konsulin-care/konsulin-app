import { Roles } from '@/constants/roles';
import { deleteCookie } from 'cookies-next';
import { IStateAuth } from './authTypes';

export const initialState: IStateAuth = {
  isAuthenticated: false,
  userInfo: {
    userId: null,
    fullname: '',
    email: '',
    role_name: Roles.Guest,
    profile_picture: '',
    fhirId: '',
    profile_complete: true
  }
};

export const reducer = (state: IStateAuth, action: any): IStateAuth => {
  switch (action.type) {
    case 'login':
      return {
        ...state,
        isAuthenticated: !!(action.payload.userId && action.payload.role_name),
        userInfo: action.payload
      };
    case 'auth-check':
      return {
        ...state,
        isAuthenticated: !!(action.payload.userId && action.payload.role_name),
        userInfo: action.payload
      };
    case 'logout':
      deleteCookie('auth');
      localStorage.clear();
      return initialState;

    default:
      return state;
  }
};
