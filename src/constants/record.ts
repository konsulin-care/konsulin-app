export const typeMappings: Record<string, { text: string; category: number }> =
  {
    PatientNote: {
      text: 'Self Journal',
      category: 4
    },
    QuestionnaireResponse: {
      text: 'Assessment',
      category: 1
    },
    PractitionerNote: {
      text: 'SOAP',
      category: 3
    },
    'SOAP Notes': {
      text: 'SOAP',
      category: 3
    },
    Condition: {
      text: 'Condition',
      category: 5
    },
    Encounter: {
      text: 'Encounter',
      category: 6
    }
  };
