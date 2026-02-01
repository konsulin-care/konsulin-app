'use client';

import { Roles } from '@/constants/roles';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { restoreAuthCookie } from '@/services/auth';
import { getProfileByIdentifier } from '@/services/profile';
import { mergeNames } from '@/utils/helper';
import { getCookie } from 'cookies-next';
import { Patient, Practitioner } from 'fhir/r4';
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
import { isProfileCompleteFromFHIR } from '../../utils/profileCompleteness';
import { initialState, reducer } from './authReducer';
import { IStateAuth } from './authTypes';

interface ContextProps {
  isLoading: boolean;
  state: IStateAuth;
  dispatch: React.Dispatch<any>;
}

const AuthContext = createContext<ContextProps | undefined>(undefined);

const INITIAL_PATHNAME_STORAGE_KEY = 'konsulin_initial_pathname';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [state, dispatch] = useReducer(reducer, initialState);
  const session = useSessionContext() as SessionContextUpdate;

  // Record pathname at first paint (full page load) so homepage can tell "reload of /" vs "navigated to /"
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        INITIAL_PATHNAME_STORAGE_KEY,
        window.location.pathname
      );
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      const auth = JSON.parse(decodeURI(getCookie('auth') || '{}'));

      if (!session.doesSessionExist) {
        // Don't create anonymous session if auth cookie suggests user is signed in (e.g. session not yet restored)
        if (!auth?.userId) {
          // Reload on homepage: let the page call ensureAnonymousSession(true) once; avoid duplicate calls
          const navEntries =
            typeof window !== 'undefined'
              ? performance.getEntriesByType('navigation')
              : [];
          const nav = navEntries[0] as PerformanceNavigationTiming | undefined;
          const isReloadOnHomepage =
            nav?.type === 'reload' &&
            typeof window !== 'undefined' &&
            window.location.pathname === '/';

          if (!isReloadOnHomepage) {
            try {
              await ensureAnonymousSession(false);
            } catch (error) {
              console.error('Failed to initialize anonymous session:', error);
            }
          }
        }
        setIsLoading(false);
        return;
      }

      // Check if auth cookie is missing but SuperTokens session is valid
      // This is the condition for auto-restoration
      const shouldRestoreAuthCookie = !auth?.userId && session.doesSessionExist;

      if (shouldRestoreAuthCookie) {
        try {
          console.log('Attempting to restore auth cookie...');
          const restorationSuccess = await restoreAuthCookie(session);

          if (restorationSuccess) {
            // After successful restoration, reload the auth cookie
            const restoredAuth = JSON.parse(
              decodeURI(getCookie('auth') || '{}')
            );
            if (restoredAuth?.userId) {
              dispatch({ type: 'auth-check', payload: restoredAuth });
              setIsLoading(false);
              return;
            }
          }
        } catch (restorationError) {
          console.error('Auth cookie restoration failed:', restorationError);
          // Continue with normal flow even if restoration fails
        }
      }

      try {
        const roles = await getClaimValue({ claim: UserRoleClaim });
        const userId = session.userId;

        const role = roles.includes(Roles.Practitioner)
          ? Roles.Practitioner
          : Roles.Patient;

        const result = (await getProfileByIdentifier({
          userId,
          type: role
        })) as Patient | Practitioner;

        if (!result) {
          dispatch({
            type: 'login',
            payload: {
              userId,
              role_name: role,
              email: '',
              fullname: '',
              profile_picture: '',
              fhirId: '',
              profile_complete: false
            }
          });

          setIsLoading(false);
          return;
        }

        const email = result.telecom?.find(
          item => item.system === 'email'
        )?.value;

        const profile_complete = isProfileCompleteFromFHIR(result);

        const payload = {
          userId,
          role_name: role,
          email,
          profile_picture: result?.photo?.[0]?.url ?? '',
          fullname: mergeNames(result?.name),
          fhirId: result?.id ?? '',
          profile_complete
        };

        dispatch({ type: 'login', payload });
      } catch (error) {
        console.error('Error fetching session:', error);
        if (auth?.userId) {
          dispatch({ type: 'auth-check', payload: auth });
        }
      } finally {
        setIsLoading(false);
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
