import { Practitioner } from 'fhir/r4';

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
    | IPractitionerRole
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
  practitionerRole: IPractitionerRole;
};

export type IPractitionerRole = {
  id: string;
  resourceType: 'PractitionerRole';
  availableTime: AvailableTime[];
  specialty: Specialty[];
  practitioner: {
    reference: string;
    identifier: {
      type: object;
      period: object;
    };
  };
  organization: {
    reference: string;
    identifier: {
      type: object;
      period: object;
    };
    display: string;
  };
  meta: Meta;
  active: boolean;
};

export type IDetailPractitionerRole = {
  resourceType: 'PractitionerRole';
  id: string;
  active: boolean;
  meta: Meta;
  practitioner: {
    reference: string;
  };
  organization: {
    reference: string;
  };
  availableTime: AvailableTime[];
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

type Qualification = {
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
};

type Name = {
  use: string;
  family: string;
  given: string[];
};

type AvailableTime = {
  availableStartTime: string;
  daysOfWeek: string[];
  availableEndTime: string;
};

type Specialty = {
  text: string;
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

type Photo = {
  url: string;
};

type Meta = {
  versionId: string;
  lastUpdated: string;
  tag?: {
    system: string;
    code: string;
  }[];
};
