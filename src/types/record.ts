import { Bundle, Coding, Practitioner } from 'fhir/r4';

export type IBundleResponse = {
  resource: Bundle;
};

export type IRecord = {
  type: string;
  id: string;
  title: string;
  result: string | ISoapSection[];
  lastUpdated: string;
  practitionerId?: string;
  practitionerProfile?: Practitioner;
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
