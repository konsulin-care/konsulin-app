import { Practitioner, PractitionerRole } from 'fhir/r4';

export type IOrganizationResource = {
  meta: Meta;
  id: string;
  name: string;
  address: Address[];
  resourceType: 'Organization';
};

export type IOrganizationEntry = {
  fullUrl: string;
  resource:
    | IOrganizationResource
    | IPractitioner
    | PractitionerRole
    | IDetailInvoice;
  search: {
    mode: string;
  };
};

export type IOrganizationDetail = {
  id: string;
  name: string;
  address: Address[];
  telecom: Telecom[];
  meta: Meta;
  resourceType: string;
  active: boolean;
};

export type IPractitioner = Practitioner & {
  practitionerRole: PractitionerRole;
};

export type IDetailInvoice = {
  resourceType: 'Invoice';
  id: string;
  status: string;
  meta: Meta;
  totalNet: {
    value: number;
    currency: string;
  };
  participant: {
    actor: {
      reference: string;
    };
  }[];
};

type Telecom = {
  system: string;
  use?: string;
  value: string;
};

type Address = {
  use: string;
  type: string;
  text: string;
  district: string;
  line: string[];
  city: string;
  postalCode: string;
  country: string;
};

type Meta = {
  versionId: string;
  lastUpdated: string;
  tag?: {
    system: string;
    code: string;
  }[];
};
