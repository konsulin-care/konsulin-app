import type { RoleProfile } from '@/services/role-profiles';
import type { Patient, Person, Practitioner } from 'fhir/r4';

export interface IStateAuth {
  isAuthenticated: boolean;
  userInfo: IStateUserInfo;
}

export interface IStateUserInfo {
  role_name?: string;
  roles?: string[];
  fullname?: string;
  userId?: string;
  email?: string;
  phoneNumber?: string;
  profile_picture?: string;
  fhirId?: string;
  organizationId?: string;
  profile_complete?: boolean;
  roleProfiles?: Record<string, RoleProfile | null>;
  fullProfile?: Patient | Practitioner | Person;
}

export type IActionAuth = IActionLogin | IActionLogout;

export interface IActionLogin {
  type: 'login' | 'auth-check';
  payload: IStateUserInfo;
}

export interface IActionLogout {
  type: 'logout';
}
