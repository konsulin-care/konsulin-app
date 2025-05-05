import { Bundle, Coding } from 'fhir/r4';

export type IBundleResponse = {
  resource: Bundle;
};

export type IRecord = {
  type: string;
  id: string;
  title: string;
  result: string;
  lastUpdated: string;
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
