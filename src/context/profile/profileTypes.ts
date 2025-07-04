import { Patient, Practitioner } from 'fhir/r4';

export type ActionProfile =
  | { type: 'updated'; payload: IProfile }
  | { type: 'getProfile'; payload: IProfile }
  | { type: 'reset' };

export type IProfile = Patient | Practitioner;
