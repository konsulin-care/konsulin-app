'use client';

import { Roles } from '@/constants/roles';
import { dbGet, dbSet, migrateLocalStorage, STORES } from '@/lib/indexeddb';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { restoreAuthCookie } from '@/services/auth';
import { setCurrentUserId, UserProfile } from '@/services/api';
import { getProfileByIdentifier } from '@/services/profile';
import { mergeNames } from '@/utils/helper';
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
      // One-time migration before reading IndexedDB cache
      try { await migrateLocalStorage(); } catch { /* non-critical */ }

      if (!session.doesSessionExist) {
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
        setIsLoading(false);
        return;
      }

      // Ensure auth cookie exists for Go SSR middleware (idempotent).
      try {
        await restoreAuthCookie(session);
      } catch { /* non-critical — cookie may already exist */ }

      try {
        const userId = session.userId;
        if (!userId) {
          console.error('Auth: userId missing from SuperTokens session');
          setIsLoading(false);
          return;
        }
        setCurrentUserId(userId);
        const roles = await getClaimValue({ claim: UserRoleClaim }) as string[] | undefined;

        // Try IndexedDB profile cache first.
          const cached = await dbGet<UserProfile>(STORES.userProfile, userId);
        if (cached?.userId === userId && cached?.role_name) {
          setCurrentUserId(userId);
          dispatch({ type: 'login', payload: cached });
          setIsLoading(false);
          return;
        }

        const role = Array.isArray(roles) && roles.includes(Roles.Practitioner)
          ? Roles.Practitioner
          : Roles.Patient;

        const result = (await getProfileByIdentifier({
          userId,
          type: role
        })) as Patient | Practitioner;

        if (!result) {
          const payload = {
            userId,
            role_name: role,
            email: '',
            fullname: '',
            profile_picture: '',
            fhirId: '',
            profile_complete: false
          };
          await dbSet(STORES.userProfile, { ...payload, roles, cachedAt: Date.now() });
          dispatch({ type: 'login', payload });
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

        await dbSet(STORES.userProfile, { ...payload, roles, cachedAt: Date.now() });
        dispatch({ type: 'login', payload });
      } catch (error) {
        console.error('Error fetching session:', error);
        // Fall back to IndexedDB cache if API fails.
        const userId = session.userId;
        if (userId) {
          setCurrentUserId(userId);
        const cached = await dbGet<UserProfile>(STORES.userProfile, userId);
          if (cached?.userId) {
            dispatch({ type: 'auth-check', payload: cached });
          }
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

/** Hook to access auth context. Throws if used outside AuthProvider. */
export const useAuth = (): ContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
