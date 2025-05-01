import { deleteCookie } from 'cookies-next';
import Session from 'supertokens-auth-react/recipe/session';
import { IStateAuth } from './authTypes';

export const initialState: IStateAuth = {
  isAuthenticated: false,
  userInfo: {
    userId: null,
    fullname: '',
    email: '',
    role_name: 'guest',
    profile_picture: '',
    fhirId: ''
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
      Session.signOut();
      deleteCookie('auth');
      localStorage.clear();
      return initialState;

    default:
      return state;
  }
};
