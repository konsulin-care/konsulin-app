import { Attachment, HumanName, PractitionerQualification } from 'fhir/r4';

export type MergedAppointment = {
  appointmentId: string;
  slotStart: string | null;
  slotEnd: string | null;
  slotStatus: string | null;
  appointmentType: string | null;
  practitionerId: string | null;
  practitionerName: HumanName[] | null;
  practitionerQualification: PractitionerQualification[] | null;
  practitionerPhoto: Attachment[] | null;
  practitionerEmail: string | null;
};

export type MergedSession = {
  appointmentId: string;
  slotStart: string | null;
  slotEnd: string | null;
  slotStatus: string | null;
  appointmentType: string | null;
  patientId: string;
  patientName: HumanName[];
  patientPhoto: Attachment[];
  patientEmail: string;
};
