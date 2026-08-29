import { Roles } from '@/constants/roles';
import { IActionAuth, IStateAuth } from './authTypes';

export const initialState: IStateAuth = {
  isAuthenticated: false,
  userInfo: {
    userId: null,
    fullname: '',
    email: '',
    role_name: Roles.Guest,
    profile_picture: '',
    fhirId: '',
    profile_complete: true,
    roleProfiles: {}
  }
};

/** Auth reducer handling login, auth-check, and logout actions. */
export const reducer = (state: IStateAuth, action: IActionAuth): IStateAuth => {
  switch (action.type) {
    case 'login':
    case 'auth-check': {
      return {
        ...state,
        isAuthenticated: Boolean(
          action.payload.userId && action.payload.role_name
        ),
        userInfo: action.payload
      };
    }
    case 'logout': {
      return initialState;
    }

    default: {
      return state;
    }
  }
};
