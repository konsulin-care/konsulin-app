/* eslint-disable max-lines */
'use client';

import { Roles } from '@/constants/roles';
import { dbGet, dbSet, migrateLocalStorage, STORES } from '@/lib/indexeddb';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { setCurrentUserId, UserProfile } from '@/services/api';
import {
  getAuthCookieSession,
  restoreAuthCookie,
  syncActiveRoleWithCookie
} from '@/services/auth';
import {
  fetchUserProfilesBundle,
  type ProfileResource,
  type RoleProfile
} from '@/services/role-profiles';
import { mergeNames } from '@/utils/helper';
import { hasPendingAssessmentClaimIntent } from '@/utils/redirect-intent';
import { roleToFhirResource } from '@/utils/role-fhir';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState
} from 'react';
import { SessionContextUpdate } from 'supertokens-auth-react/lib/build/recipe/session/types';
import {
  attemptRefreshingSession,
  getClaimValue,
  useSessionContext
} from 'supertokens-auth-react/recipe/session';
import { UserRoleClaim } from 'supertokens-web-js/recipe/userroles';
import { isProfileCompleteFromFHIR } from '../../utils/profileCompleteness';
import { initialState, reducer } from './authReducer';
import { IActionAuth, IStateAuth, IStateUserInfo } from './authTypes';

interface ContextProps {
  isLoading: boolean;
  state: IStateAuth;
  dispatch: React.Dispatch<IActionAuth>;
  /** Re-fetch the full profile bundle and refresh the cached auth payload. */
  refreshProfiles?: () => Promise<void>;
}

type UserRole =
  | typeof Roles.Practitioner
  | typeof Roles.ClinicAdmin
  | typeof Roles.Patient;

/** Extract the photo URL from a FHIR profile (always an Attachment array). */
function extractPhotoUrl(profile: ProfileResource | null): string {
  return profile?.photo?.[0]?.url ?? '';
}

/** Build the login payload from the active profile resource. */
function buildLoginPayload(
  userId: string,
  role: UserRole,
  superTokensRoles: string[] | undefined,
  profile: ProfileResource,
  roleProfiles: Record<string, RoleProfile | null>
): IStateUserInfo {
  return {
    userId,
    role_name: role,
    roles: superTokensRoles,
    email: profile.telecom?.find(item => item.system === 'email')?.value,
    profile_picture: extractPhotoUrl(profile),
    fullname: mergeNames(profile.name),
    fhirId: profile.id ?? '',
    organizationId: roleProfiles[role]?.organizationId,
    profile_complete: isProfileCompleteFromFHIR(profile),
    roleProfiles,
    fullProfile: profile,
    cachedAt: Date.now()
  };
}

/** True when every non-null role profile carries its full resource. */
function roleProfilesCarryResources(
  roleProfiles: Record<string, RoleProfile | null> | undefined
): boolean {
  if (!roleProfiles) return false;
  return Object.values(roleProfiles).every(
    profile => profile === null || Boolean(profile.resource)
  );
}

/**
 * True when every non-null role profile's resource type matches the role's
 * backing FHIR resource. Rejects Person-era caches (Clinic Admin/Researcher
 * are now Practitioner) without a version-key migration.
 */
function roleProfilesCarryMatchingTypes(
  roleProfiles: Record<string, RoleProfile | null> | undefined
): boolean {
  if (!roleProfiles) return true;
  return Object.entries(roleProfiles).every(([role, profile]) => {
    if (profile === null) return true;
    if (!profile.resource) return false;
    return profile.resource.resourceType === roleToFhirResource(role);
  });
}

/** True when a cached profile can serve the session.
 *
 * Single-role users always use the cache. Multi-role users only when the
 * cache carries the full role profile resources — a pre-bundle cache or an
 * old-shape cache (name/photoUrl only) is rejected so the profile page and
 * the multi-role save flow never read stale or partial resources. A cache
 * whose role resources carry a stale Person type is also rejected.
 */
function isCacheUsable(
  cached: UserProfile | null,
  superTokensRoles: string[] | undefined
): boolean {
  if (!cached) return false;
  // A cache without identity data is a broken payload from a failed fetch;
  // never serve it — force a refetch so the profile self-heals.
  if (!cached.fullname && !cached.fhirId) return false;
  const isMultiRole =
    Array.isArray(superTokensRoles) && superTokensRoles.length > 1;
  return (
    roleProfilesCarryMatchingTypes(cached.roleProfiles) &&
    (!isMultiRole || roleProfilesCarryResources(cached.roleProfiles))
  );
}

// skipcq: JS-W1042 - createContext requires a default value per React API
const AuthContext = createContext<ContextProps | undefined>(undefined);

const INITIAL_PATHNAME_STORAGE_KEY = 'konsulin_initial_pathname';

/** Resolve the active user role from cookie or SuperTokens claims. */
export function resolveActiveRole(
  cookieRole: string | undefined,
  superTokensRoles: string[] | undefined
): UserRole {
  if (cookieRole) return cookieRole as UserRole;
  if (Array.isArray(superTokensRoles)) {
    // A guest claiming an assessment result must be linked to the Patient
    // resource, even when the default priority would pick another role.
    if (
      superTokensRoles.includes(Roles.Patient) &&
      hasPendingAssessmentClaimIntent()
    ) {
      return Roles.Patient;
    }
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
    return cleanup; // eslint-disable-line @typescript-eslint/no-unsafe-return
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

  /** Persists the selected clinic organization id in IndexedDB. */
  const persistClinicOrganization = (orgId: string) =>
    dbSet(STORES.uiPreferences, {
      ownerId: '',
      prefKey: 'clinic_organization',
      value: orgId
    });

  /** Persist the fhirId for one role in a per-role map (multi-role support). */
  const persistFhirIdForRole = async (
    userId: string,
    role: string,
    fhirId: string
  ): Promise<void> => {
    try {
      const existing = await dbGet<{ value: Record<string, string> }>(
        STORES.uiPreferences,
        ['', `fhirId_map_${userId}`]
      );
      const map = existing?.value ?? {};
      map[role] = fhirId;
      await dbSet(STORES.uiPreferences, {
        ownerId: '',
        prefKey: `fhirId_map_${userId}`,
        value: map
      });
    } catch (err) {
      console.warn('fhirId map persistence failed:', err);
    }
  };

  /** Read stored fhirId for a role, or undefined if absent. */
  const getStoredFhirIdForRole = async (
    userId: string,
    role: string
  ): Promise<string | undefined> => {
    try {
      const existing = await dbGet<{ value: Record<string, string> }>(
        STORES.uiPreferences,
        ['', `fhirId_map_${userId}`]
      );
      return existing?.value?.[role];
    } catch {
      return undefined;
    }
  };

  /** Resolve user role from auth cookie and SuperTokens claims. */
  const resolveUserRoles = async (): Promise<{
    role: UserRole;
    superTokensRoles: string[] | undefined;
  }> => {
    const cookieSession = await getAuthCookieSession();
    const cookieRole = cookieSession?.role_name;
    const superTokensRoles = await getClaimValue({
      claim: UserRoleClaim
    });
    const role = resolveActiveRole(cookieRole, superTokensRoles);
    return { role, superTokensRoles };
  };

  /** Fetch profile from API and dispatch login. */
  const fetchAndDispatchProfile = async (
    userId: string,
    role: UserRole,
    superTokensRoles: string[] | undefined
  ): Promise<void> => {
    const { activeProfile: result, roleProfiles } =
      await fetchUserProfilesBundle(userId, superTokensRoles ?? [role], role);

    if (!result) {
      const payload: IStateUserInfo = {
        userId,
        role_name: role,
        roles: superTokensRoles,
        email: '',
        fullname: '',
        profile_picture: '',
        fhirId: '',
        profile_complete: false,
        roleProfiles,
        fullProfile: undefined
      };
      // Never persist an empty profile: caching it would poison the next
      // load (isCacheUsable rejects empty caches and forces a refetch).
      dispatch({ type: 'login', payload });
      await persistFhirIdForRole(userId, role, '');
      return;
    }

    const payload = buildLoginPayload(
      userId,
      role,
      superTokensRoles,
      result,
      roleProfiles
    );

    await dbSet(STORES.userProfile, {
      ...payload,
      roles: superTokensRoles,
      cachedAt: Date.now()
    });
    dispatch({ type: 'login', payload });
    await persistFhirIdForRole(userId, role, result.id ?? '');

    // Clinic admin: persist managingOrganization as clinic_organization
    if (role === Roles.ClinicAdmin && payload.organizationId) {
      await persistClinicOrganization(payload.organizationId);
    }
  };

  /** Dispatch fallback profile when API fetch fails. */
  const fallbackProfileOnError = async (
    userId: string,
    role?: string
  ): Promise<void> => {
    const fallbackCookie = await getAuthCookieSession();
    if (fallbackCookie?.authenticated && fallbackCookie?.role_name) {
      // Prefer stored per-role fhirId over stale auth cookie value
      const storedFhirId = role
        ? await getStoredFhirIdForRole(userId, role)
        : undefined;
      const resolvedFhirId = storedFhirId ?? fallbackCookie.fhirId ?? '';
      const payload = {
        userId,
        role_name: fallbackCookie.role_name,
        roles: fallbackCookie.roles ?? [],
        email: fallbackCookie.email ?? '',
        fullname: fallbackCookie.fullname ?? '',
        profile_picture: fallbackCookie.profile_picture ?? '',
        fhirId: resolvedFhirId,
        profile_complete: fallbackCookie.profile_complete ?? false,
        roleProfiles: {},
        fullProfile: undefined
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

  /** Re-fetch the full profile bundle and refresh the cached auth payload. */
  const refreshProfiles = useCallback(async (): Promise<void> => {
    const existing = state.userInfo;
    const userId = existing?.userId;
    const activeRole = existing?.role_name;
    if (!userId || !activeRole) return;
    const roles =
      existing?.roles && existing.roles.length > 0
        ? existing.roles
        : [activeRole];
    try {
      const { activeProfile: result, roleProfiles } =
        await fetchUserProfilesBundle(userId, roles, activeRole);
      if (!result) return; // keep the existing cache when the active profile vanished
      const payload = buildLoginPayload(
        userId,
        activeRole as UserRole,
        existing?.roles,
        result,
        roleProfiles
      );
      await dbSet(STORES.userProfile, {
        ...payload,
        cachedAt: Date.now()
      });
      dispatch({ type: 'auth-check', payload });

      if (activeRole === Roles.ClinicAdmin && payload.organizationId) {
        await persistClinicOrganization(payload.organizationId);
      }
    } catch (error) {
      console.error('Auth: profile refresh failed', error);
    }
  }, [state.userInfo, dispatch]);

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
    if (
      cached?.userId === userId &&
      cached?.role_name === role &&
      isCacheUsable(cached, superTokensRoles)
    ) {
      setCurrentUserId(userId);
      dispatch({ type: 'login', payload: cached });

      // Clinic admin with cached orgId: persist as clinic_organization
      if (role === Roles.ClinicAdmin && cached?.organizationId) {
        await persistClinicOrganization(cached.organizationId);
        return;
      }
      // Non-admin returns; clinic admin without orgId falls through to fresh API fetch
      if (role !== Roles.ClinicAdmin) return;
    }

    try {
      await fetchAndDispatchProfile(userId, role, superTokensRoles);
    } catch (error) {
      console.error('Error fetching session:', error);
      await fallbackProfileOnError(userId, role);
    }
  };

  /** Handle auth state when a SuperTokens session already exists. */
  const handleSessionExists = async () => {
    // Renew the access token before the restore POST: the Go BFF verifies the
    // sAccessToken JWT and rejects expired tokens (1h TTL), so restoring the
    // auth cookie fails on reloads after idle unless the token is fresh.
    try {
      await attemptRefreshingSession();
    } catch (error) {
      console.error('Auth: session refresh before restore failed:', error);
    }
    const restored = await tryRestoreAuthCookie();
    if (!restored) {
      setIsLoading(false);
      return;
    }
    // Heal sessions whose SuperTokens active-role claim diverges from the
    // auth cookie role: push the cookie's role (the user's expressed choice)
    // to the backend claim. Best-effort and reload-free — the frontend state
    // already matches the cookie; only the token claim moves.
    try {
      await syncActiveRoleWithCookie();
    } catch (error) {
      console.error('Auth: active-role resync failed:', error);
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

    fetchSession().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.doesSessionExist]);

  return (
    <AuthContext.Provider
      value={{ isLoading, state, dispatch, refreshProfiles }}
    >
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
