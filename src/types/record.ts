import { Bundle } from 'fhir/r4';

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
