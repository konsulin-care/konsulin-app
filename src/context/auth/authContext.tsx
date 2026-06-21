'use client';

import { Roles } from '@/constants/roles';
import { dbGet, dbSet, migrateLocalStorage, STORES } from '@/lib/indexeddb';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { setCurrentUserId, UserProfile } from '@/services/api';
import { getAuthCookieSession, restoreAuthCookie } from '@/services/auth';
import { getProfileByIdentifier } from '@/services/profile';
import { mergeNames } from '@/utils/helper';
import { roleToFhirResource } from '@/utils/role-fhir';
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

type UserRole =
  | typeof Roles.Practitioner
  | typeof Roles.ClinicAdmin
  | typeof Roles.Patient;

// skipcq: JS-W1042 - createContext requires a default value per React API
const AuthContext = createContext<ContextProps | undefined>(undefined);

const INITIAL_PATHNAME_STORAGE_KEY = 'konsulin_initial_pathname';

/** Resolve the active user role from cookie or SuperTokens claims. */
function resolveActiveRole(
  cookieRole: string | undefined,
  superTokensRoles: string[] | undefined
): UserRole {
  if (cookieRole) return cookieRole as UserRole;
  if (Array.isArray(superTokensRoles)) {
    if (superTokensRoles.includes(Roles.Practitioner))
      return Roles.Practitioner;
    if (superTokensRoles.includes(Roles.ClinicAdmin)) return Roles.ClinicAdmin;
  }
  return Roles.Patient;
}

/** Auth provider wrapping the app with session bootstrap and auth state. */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [state, dispatch] = useReducer(reducer, initialState);
  const session = useSessionContext() as SessionContextUpdate;

  // Record pathname at first paint (full page load) so homepage can tell "reload of /" vs "navigated to /"
  useEffect(() => {
    if (globalThis.window === undefined) return;
    try {
      sessionStorage.setItem(
        INITIAL_PATHNAME_STORAGE_KEY,
        globalThis.location.pathname
      );
    } catch {
      // ignore
    }
  }, []);

  // Safety timeout: force-reset loading if SuperTokens never initializes.
  useEffect(() => {
    let cleanup;
    if (session.doesSessionExist === undefined) {
      const id = setTimeout(() => {
        setIsLoading(false);
        console.error(
          'Auth: SuperTokens session did not initialize within 10s, proceeding as unauthenticated'
        );
      }, 10_000);
      cleanup = () => clearTimeout(id);
    }
    return cleanup;
  }, [session.doesSessionExist]);

  /** Handle auth state when no SuperTokens session exists. */
  const handleNoSession = async () => {
    const cookieSession = await getAuthCookieSession();

    // SuperTokens session is dead but auth cookie lingers. Delete it so
    // RedirectAuthenticated middleware stops blocking /auth, allowing re-login.
    if (cookieSession?.authenticated) {
      console.warn(
        'Auth: SuperTokens session missing but auth cookie exists — clearing auth cookie to unblock /auth'
      );
      try {
        const res = await fetch('/auth/cookie', { method: 'DELETE' });
        if (!res.ok) {
          console.warn('Auth: stale auth cookie deletion returned', res.status);
          dispatch({ type: 'logout' });
          setCurrentUserId(null);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('Auth: failed to delete stale auth cookie:', err);
        dispatch({ type: 'logout' });
        setCurrentUserId(null);
        setIsLoading(false);
        return;
      }
      globalThis.location.href = '/auth';
      return;
    }

    dispatch({ type: 'logout' });
    setCurrentUserId(null);

    const navEntries =
      globalThis.window === undefined
        ? []
        : performance.getEntriesByType('navigation');
    const nav = navEntries[0] as PerformanceNavigationTiming | undefined;
    const isReloadOnHomepage =
      nav?.type === 'reload' && globalThis.window?.location.pathname === '/';

    if (!isReloadOnHomepage) {
      try {
        await ensureAnonymousSession(false);
      } catch (error) {
        console.error('Failed to initialize anonymous session:', error);
      }
    }
    setIsLoading(false);
  };

  /** Attempt to restore the auth cookie; returns false to abort bootstrap. */
  const tryRestoreAuthCookie = async (): Promise<boolean> => {
    try {
      const restored = await restoreAuthCookie(session);
      if (!restored) {
        console.error('restoreAuthCookie failed, aborting bootstrap');
        return false;
      }
      return true;
    } catch (err) {
      console.error('restoreAuthCookie unexpected error:', err);
      return false;
    }
  };

  /** Resolve user role from auth cookie and SuperTokens claims. */
  const resolveUserRoles = async (): Promise<{
    role: UserRole;
    superTokensRoles: string[] | undefined;
  }> => {
    const cookieSession = await getAuthCookieSession();
    const cookieRole = cookieSession?.role_name;
    const superTokensRoles = (await getClaimValue({
      claim: UserRoleClaim
    })) as string[] | undefined;
    const role = resolveActiveRole(cookieRole, superTokensRoles);
    return { role, superTokensRoles };
  };

  /** Fetch profile from API and dispatch login. */
  const fetchAndDispatchProfile = async (
    userId: string,
    role: UserRole,
    superTokensRoles: string[] | undefined
  ): Promise<void> => {
    const result = await getProfileByIdentifier({
      userId,
      type: roleToFhirResource(role)
    });

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
      await dbSet(STORES.userProfile, { ...payload, cachedAt: Date.now() });
      dispatch({ type: 'login', payload });
      return;
    }

    const email = result.telecom?.find(item => item.system === 'email')?.value;
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
  };

  /** Dispatch fallback profile when API fetch fails. */
  const fallbackProfileOnError = async (userId: string): Promise<void> => {
    const fallbackCookie = await getAuthCookieSession();
    if (fallbackCookie?.authenticated && fallbackCookie?.role_name) {
      const payload = {
        userId,
        role_name: fallbackCookie.role_name,
        roles: fallbackCookie.roles ?? [],
        email: fallbackCookie.email ?? '',
        fullname: fallbackCookie.fullname ?? '',
        profile_picture: fallbackCookie.profile_picture ?? '',
        fhirId: fallbackCookie.fhirId ?? '',
        profile_complete: fallbackCookie.profile_complete ?? false
      };
      dispatch({ type: 'login', payload });
    } else {
      const fallbackCached = await dbGet<UserProfile>(
        STORES.userProfile,
        userId
      );
      if (fallbackCached?.userId) {
        dispatch({ type: 'auth-check', payload: fallbackCached });
      }
    }
  };

  /** Fetch profile and login, falling back to auth cookie on error. */
  const fetchProfileAndLogin = async () => {
    const userId = session.userId;
    if (!userId) {
      console.error('Auth: userId missing from SuperTokens session');
      return;
    }
    setCurrentUserId(userId);

    let role: UserRole;
    let superTokensRoles: string[] | undefined;
    try {
      const result = await resolveUserRoles();
      role = result.role;
      superTokensRoles = result.superTokensRoles;
    } catch (error) {
      console.error('Auth: failed to resolve user roles:', error);
      await fallbackProfileOnError(userId);
      return;
    }

    let cached: UserProfile | null = null;
    try {
      cached = await dbGet<UserProfile>(STORES.userProfile, userId);
    } catch {
      // IndexedDB unavailable — skip cache and fetch from API
    }
    if (cached?.userId === userId && cached?.role_name === role) {
      setCurrentUserId(userId);
      dispatch({ type: 'login', payload: cached });
      return;
    }

    try {
      await fetchAndDispatchProfile(userId, role, superTokensRoles);
    } catch (error) {
      console.error('Error fetching session:', error);
      await fallbackProfileOnError(userId);
    }
  };

  /** Handle auth state when a SuperTokens session already exists. */
  const handleSessionExists = async () => {
    const restored = await tryRestoreAuthCookie();
    if (!restored) {
      setIsLoading(false);
      return;
    }
    try {
      await fetchProfileAndLogin();
    } catch (error) {
      console.error('Auth: fetchProfileAndLogin threw unexpectedly:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    /** Fetches the current session and dispatches the auth result to context. */
    const fetchSession = async () => {
      if (session.doesSessionExist === undefined) return;

      try {
        await migrateLocalStorage();
      } catch {
        /* non-critical */
      }

      if (!session.doesSessionExist) {
        await handleNoSession();
        return;
      }

      await handleSessionExists();
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
