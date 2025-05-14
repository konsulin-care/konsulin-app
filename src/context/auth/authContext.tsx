'use client';

import { setCookies } from '@/app/actions';
import { getProfileByIdentifier } from '@/services/profile';
import { mergeNames } from '@/utils/helper';
import { getCookie } from 'cookies-next';
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState
} from 'react';
import { SessionContextUpdate } from 'supertokens-auth-react/lib/build/recipe/session/types';
import {
  getClaimValue,
  useSessionContext
} from 'supertokens-auth-react/recipe/session';
import { UserRoleClaim } from 'supertokens-web-js/recipe/userroles';
import { initialState, reducer } from './authReducer';
import { IStateAuth } from './authTypes';

interface ContextProps {
  isLoading: boolean;
  state: IStateAuth;
  dispatch: React.Dispatch<any>;
}

const AuthContext = createContext<ContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setisLoading] = useState(true);
  const [state, dispatch] = useReducer(reducer, initialState);
  const session = useSessionContext() as SessionContextUpdate;

  useEffect(() => {
    const auth = JSON.parse(decodeURI(getCookie('auth') || '{}'));

    const fetchSession = async () => {
      if (!session.doesSessionExist) {
        setisLoading(false);
        return;
      }

      try {
        if (
          session.doesSessionExist &&
          (Object.keys(auth).length === 0 || !auth.userId)
        ) {
          const roles = await getClaimValue({ claim: UserRoleClaim });
          const userId = session.userId;

          const result = await getProfileByIdentifier({
            userId,
            type: roles.includes('practitioner') ? 'Practitioner' : 'Patient'
          });

          const emails = result.telecom.find(item => item.system === 'email');

          const payload = {
            userId,
            role_name: roles.includes('practitioner')
              ? 'practitioner'
              : 'patient',
            email: emails?.value,
            profile_picture: result?.photo ? result?.photo[0]?.url : '',
            fullname: mergeNames(result?.name, result?.qualification),
            fhirId: result?.id ?? ''
          };

          await setCookies('auth', JSON.stringify(payload));

          dispatch({ type: 'login', payload });
        } else {
          const payload = {
            role_name: auth.role_name,
            fullname: auth.fullname || auth.email,
            email: auth.email,
            userId: auth.userId,
            profile_picture: auth.profile_picture,
            fhirId: auth.fhirId
          };

          dispatch({
            type: 'auth-check',
            payload
          });
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setisLoading(false);
      }
    };

    fetchSession();
  }, [session.doesSessionExist]);

  return (
    <AuthContext.Provider value={{ isLoading, state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): ContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a AuthProvider');
  }

  return context;
};
