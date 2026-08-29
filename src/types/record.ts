import { Bundle, Coding, Patient, Practitioner } from 'fhir/r4';

export type IBundleResponse = {
  resource: Bundle;
};

/** Shape of a single $everything response page (raw Bundle). */
export interface IEverythingBundlePage {
  bundle: Bundle;
  records: IRecord[];
  nextUrl?: string;
}

export type IRecord = {
  type: string;
  /** Actual FHIR resource type, e.g. "Observation", "Condition" */
  resourceType: string;
  id: string;
  title: string;
  result: string | ISoapSection[];
  lastUpdated: string;
  practitionerId?: string;
  practitionerProfile?: Practitioner;
  patientProfile?: Patient;
};

export type ISoapSection = {
  section: string;
  label: string;
  value: string;
};

export type IJournal = {
  valueString?: string;
  resourceType?: string;
  note?: {
    text: string;
  }[];
  effectiveDateTime?: string;
  status?: string;
  id?: string;
  code?: {
    coding: Coding[];
  };
  subject?: {
    reference: string;
  };
  performer?: {
    reference: string;
  }[];
};
