'use client';

import { Roles } from '@/constants/roles';
import { getAPI } from '@/services/api';
import { restoreAuthCookie } from '@/services/auth';
import { getProfileByIdentifier } from '@/services/profile';
import {
  getGuestAssessmentResponseIds,
  setGuestAssessmentResponseIds
} from '@/utils/guest-assessment-storage';
import { mergeNames } from '@/utils/helper';
import { getCookie } from 'cookies-next';
import { Patient, Practitioner } from 'fhir/r4';
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [state, dispatch] = useReducer(reducer, initialState);
  const session = useSessionContext() as SessionContextUpdate;
  const hasLinkedGuestAssessmentsRef = useRef(false);

  useEffect(() => {
    const fetchSession = async () => {
      const auth = JSON.parse(decodeURI(getCookie('auth') || '{}'));

      if (!session.doesSessionExist) {
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

  useEffect(() => {
    if (!state.isAuthenticated) {
      hasLinkedGuestAssessmentsRef.current = false;
      return;
    }

    if (hasLinkedGuestAssessmentsRef.current) return;

    const roleName = state.userInfo?.role_name;
    const isPatientRole = roleName === Roles.Patient || roleName === 'patient';
    if (!isPatientRole) return;

    const patientId =
      (state.userInfo as any)?.fhirId ?? (state.userInfo as any)?.id ?? '';
    if (!patientId) return;

    const responseIds = getGuestAssessmentResponseIds();
    if (responseIds.length === 0) {
      hasLinkedGuestAssessmentsRef.current = true;
      return;
    }

    hasLinkedGuestAssessmentsRef.current = true;

    const linkResponses = async () => {
      try {
        const API = await getAPI();

        const results = await Promise.allSettled(
          responseIds.map(async responseId => {
            const { data: existing } = await API.get(
              `/fhir/QuestionnaireResponse/${responseId}`
            );

            const updated = {
              ...existing,
              author: { reference: `Patient/${patientId}` },
              subject: { reference: `Patient/${patientId}` }
            };

            await API.put(`/fhir/QuestionnaireResponse/${responseId}`, updated);
          })
        );

        const failedIds = results.flatMap((result, idx) =>
          result.status === 'rejected' ? [responseIds[idx]] : []
        );

        setGuestAssessmentResponseIds(failedIds);
      } catch (error) {
        console.error('Failed to link guest assessment responses:', error);
      }
    };

    linkResponses();
  }, [
    state.isAuthenticated,
    state.userInfo?.fhirId,
    state.userInfo?.role_name
  ]);

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
