export const typeMappings: Record<
  string,
  { text: string; labelKey: string; category: number }
> = {
  PatientNote: {
    text: 'Self Journal',
    labelKey: 'record.record_type.self_journal',
    category: 4
  },
  QuestionnaireResponse: {
    text: 'Assessment',
    labelKey: 'record.record_type.assessment',
    category: 1
  },
  PractitionerNote: {
    text: 'Practitioner Note',
    labelKey: 'record.record_type.practitioner_note',
    category: 3
  },
  'SOAP Notes': {
    text: 'SOAP',
    labelKey: 'record.record_type.soap',
    category: 3
  },
  Condition: {
    text: 'Condition',
    labelKey: 'record.record_type.condition',
    category: 5
  },
  Encounter: {
    text: 'Encounter',
    labelKey: 'record.record_type.encounter',
    category: 6
  }
};
