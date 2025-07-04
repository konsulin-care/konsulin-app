import { Invoice, Organization, PractitionerRole, Schedule } from 'fhir/r4';

export type IPractitionerRoleDetail = PractitionerRole & {
  organizationData: Organization;
  scheduleData: Schedule;
  invoiceData: Invoice;
};
