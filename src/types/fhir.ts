import type { Patient, Practitioner } from 'fhir/r4';

/** Union type for FHIR profile resources, supporting both Patient and Practitioner. */
export type FHIRProfile = Patient | Practitioner | null;
