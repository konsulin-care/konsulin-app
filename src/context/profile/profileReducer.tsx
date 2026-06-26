/* eslint-disable sonarjs/no-commented-code, sonarjs/no-duplicated-branches */
import { ActionProfile, IProfile } from './profileTypes';

// export const initialState: StateProfile = {
//   profile: {
//     fullname: '',
//     email: '',
//     birth_date: undefined,
//     whatsapp_number: '',
//     gender: '',
//     address: '',
//     educations: [],
//     practice_informations: null,
//     practice_availabilities: null,
//     profile_picture: undefined
//   }
// }

export const initialState = {
  resourceType: null,
  id: null,
  active: null,
  birthDate: null,
  gender: null,
  photo: [],
  identifier: [],
  name: null,
  address: [],
  telecom: []
};

/** Profile state reducer handling authentication update actions. */
export const reducer = (
  state = initialState,
  action: ActionProfile
): IProfile => {
  switch (action.type) {
    case 'updated': {
      return {
        ...state,
        ...action.payload
      };
    }
    case 'getProfile': {
      return {
        ...state,
        ...action.payload
      };
    }
    case 'reset': {
      return initialState;
    }
    default: {
      return state;
    }
  }
};

export default reducer;
