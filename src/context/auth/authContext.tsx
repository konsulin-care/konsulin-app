'use client';

import { setCookies } from '@/app/actions';
import { Roles } from '@/constants/roles';
import { getAPI } from '@/services/api';
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
import { initialState, reducer } from './authReducer';
import { IStateAuth } from './authTypes';

interface ContextProps {
  isLoading: boolean;
  state: IStateAuth;
  dispatch: React.Dispatch<any>;
}

const AuthContext = createContext<ContextProps | undefined>(undefined);

const persistGuestAssessments = async (patientFhirId: string) => {
  const API = await getAPI();

  const keys = Object.keys(localStorage).filter(key =>
    key.startsWith('response_')
  );

  for (const key of keys) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) continue;

      const questionnaireResponse = JSON.parse(stored);
      if (!questionnaireResponse?.id) continue;

      await API.put(`/fhir/QuestionnaireResponse/${questionnaireResponse.id}`, {
        ...questionnaireResponse,
        subject: {
          reference: `Patient/${patientFhirId}`
        },
        status: 'completed'
      });

      localStorage.removeItem(key);
    } catch (error) {
      console.error(
        `Failed to persist guest assessment for key ${key}:`,
        error
      );
    }
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setisLoading] = useState(true);
  const [state, dispatch] = useReducer(reducer, initialState);
  const session = useSessionContext() as SessionContextUpdate;

  useEffect(() => {
    const fetchSession = async () => {
      const auth = JSON.parse(decodeURI(getCookie('auth') || '{}'));
      if (!session.doesSessionExist) {
        setisLoading(false);
        return;
      }

      try {
        if (session.doesSessionExist) {
          const roles = await getClaimValue({ claim: UserRoleClaim });
          const userId = session.userId;

          const result = (await getProfileByIdentifier({
            userId,
            type: roles.includes('Practitioner') ? 'Practitioner' : 'Patient'
          })) as Patient | Practitioner;

          const emails = result.telecom.find(item => item.system === 'email');

          const payload = {
            userId,
            role_name: roles.includes(Roles.Practitioner)
              ? Roles.Practitioner
              : Roles.Patient,
            email: emails?.value,
            profile_picture: result?.photo ? result?.photo[0]?.url : '',
            fullname: mergeNames(result?.name),
            fhirId: result?.id ?? ''
          };

          await setCookies('auth', JSON.stringify(payload));

          dispatch({ type: 'login', payload });

          if (payload.fhirId) {
            await persistGuestAssessments(payload.fhirId);
          }
        } else {
          // Repair cookie when fhirId is empty/missing
          if (!auth.fhirId) {
            const roles = await getClaimValue({ claim: UserRoleClaim });
            const type = roles.includes('Practitioner')
              ? 'Practitioner'
              : 'Patient';
            const userId = auth.userId || session.userId;

            const result = (await getProfileByIdentifier({ userId, type })) as
              | Patient
              | Practitioner;
            if (result) {
              const emails = result?.telecom?.find(
                (item: any) => item.system === 'email'
              );
              const repairedPayload = {
                userId,
                role_name: roles.includes(Roles.Practitioner)
                  ? Roles.Practitioner
                  : Roles.Patient,
                email: emails?.value || auth.email,
                profile_picture: result?.photo ? result?.photo[0]?.url : '',
                fullname: mergeNames(result?.name),
                fhirId: result?.id ?? ''
              };

              await setCookies('auth', JSON.stringify(repairedPayload));
              dispatch({ type: 'auth-check', payload: repairedPayload });
            } else {
              // No profile found; keep existing cookie (fhirId stays empty)
              const payload = {
                role_name: auth.role_name,
                fullname: auth.fullname || auth.email,
                email: auth.email,
                userId: auth.userId,
                profile_picture: auth.profile_picture,
                fhirId: ''
              };
              dispatch({ type: 'auth-check', payload });
            }
          }
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
