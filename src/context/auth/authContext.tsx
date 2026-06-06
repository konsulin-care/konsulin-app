'use client';

import { Roles } from '@/constants/roles';
import { dbGet, dbSet, migrateLocalStorage, STORES } from '@/lib/indexeddb';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { setCurrentUserId, UserProfile } from '@/services/api';
import { getAuthCookieSession, restoreAuthCookie } from '@/services/auth';
import { getProfileByIdentifier } from '@/services/profile';
import { mergeNames } from '@/utils/helper';
import { Patient, Practitioner } from 'fhir/r4';
import React, {
  createContext,
  ReactNode,
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
import { IActionAuth, IStateAuth } from './authTypes';

interface ContextProps {
  isLoading: boolean;
  state: IStateAuth;
  dispatch: React.Dispatch<IActionAuth>;
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
    // eslint-disable-next-line sonarjs/cognitive-complexity
    const fetchSession = async () => {
      // SuperTokens is still initializing — wait for the next effect cycle
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = session as any;
      if (ctx.loading) return;

      // One-time migration before reading IndexedDB cache
      try {
        await migrateLocalStorage();
      } catch {
        /* non-critical */
      }

      if (!session.doesSessionExist) {
        // Clear stale auth state on session expiry.
        dispatch({ type: 'logout' });
        setCurrentUserId(null);

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
        const restored = await restoreAuthCookie(session);
        if (!restored) {
          console.error('restoreAuthCookie failed, aborting bootstrap');
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('restoreAuthCookie unexpected error:', err);
        setIsLoading(false);
        return;
      }

      try {
        const userId = session.userId;
        if (!userId) {
          console.error('Auth: userId missing from SuperTokens session');
          setIsLoading(false);
          return;
        }
        setCurrentUserId(userId);

        // Read active role from auth cookie (source of truth after role switch).
        const cookieSession = await getAuthCookieSession();
        const cookieRole = cookieSession?.role_name;

        const superTokensRoles = (await getClaimValue({
          claim: UserRoleClaim
        })) as string[] | undefined;

        // Role priority: auth cookie > SuperTokens hardcoded priority.
        const role =
          cookieRole ||
          (Array.isArray(superTokensRoles) &&
          superTokensRoles.includes(Roles.Practitioner)
            ? Roles.Practitioner
            : Array.isArray(superTokensRoles) &&
                superTokensRoles.includes(Roles.ClinicAdmin)
              ? Roles.ClinicAdmin
              : Roles.Patient);

        const cached = await dbGet<UserProfile>(STORES.userProfile, userId);

        // Use cache only if it matches the active role.
        if (cached?.userId === userId && cached?.role_name === role) {
          setCurrentUserId(userId);
          dispatch({ type: 'login', payload: cached });
          setIsLoading(false);
          return;
        }

        const result = (await getProfileByIdentifier({
          userId,
          type: role
        })) as Patient | Practitioner;

        if (!result) {
          const payload = {
            userId,
            role_name: role,
            roles: superTokensRoles,
            email: '',
            fullname: '',
            profile_picture: '',
            fhirId: '',
            profile_complete: false
          };
          await dbSet(STORES.userProfile, {
            ...payload,
            cachedAt: Date.now()
          });
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
          roles: superTokensRoles,
          email,
          profile_picture: result?.photo?.[0]?.url ?? '',
          fullname: mergeNames(result?.name),
          fhirId: result?.id ?? '',
          profile_complete
        };

        await dbSet(STORES.userProfile, {
          ...payload,
          roles: superTokensRoles,
          cachedAt: Date.now()
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
