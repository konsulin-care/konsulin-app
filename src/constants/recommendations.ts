export interface Recommendation {
  id: string;
  photoUrl: string;
  name: string;
  serviceName: string;
  specialties: string[];
  fee: number;
  description: string;
  practitionerRoleId: string;
  healthcareServiceId: string;
}

export const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'practitioner-1',
    photoUrl: '',
    name: 'dr. Sarah Chen',
    serviceName: 'Smoking-Cessation Counselling',
    specialties: ['addiction', 'substance use'],
    fee: 500_000,
    description:
      'Professional counselling to help overcome smoking addiction through evidence-based techniques and personalized support.',
    practitionerRoleId: 'PractitionerRole/pr-1',
    healthcareServiceId: 'HealthcareService/hs-1'
  },
  {
    id: 'practitioner-2',
    photoUrl: '',
    name: 'dr. Budi Santoso',
    serviceName: 'Cognitive Behavioral Therapy',
    specialties: ['anxiety', 'depression', 'stress'],
    fee: 400_000,
    description:
      'Structured therapy sessions focused on identifying and changing negative thought patterns and behaviors.',
    practitionerRoleId: 'PractitionerRole/pr-2',
    healthcareServiceId: 'HealthcareService/hs-2'
  },
  {
    id: 'practitioner-3',
    photoUrl: '',
    name: 'dr. Maya Putri',
    serviceName: 'Child & Adolescent Psychology',
    specialties: ['pediatric', 'developmental'],
    fee: 450_000,
    description:
      'Specialized psychological support for children and adolescents addressing developmental and emotional challenges.',
    practitionerRoleId: 'PractitionerRole/pr-3',
    healthcareServiceId: 'HealthcareService/hs-3'
  },
  {
    id: 'practitioner-4',
    photoUrl: '',
    name: 'dr. Alex Turner',
    serviceName: 'Neuropsychology Assessment',
    specialties: ['neurology', 'cognitive'],
    fee: 600_000,
    description:
      'Comprehensive assessment of cognitive function to evaluate memory, attention, and other neurological processes.',
    practitionerRoleId: 'PractitionerRole/pr-4',
    healthcareServiceId: 'HealthcareService/hs-4'
  },
  {
    id: 'practitioner-5',
    photoUrl: '',
    name: 'dr. Rina Wijaya',
    serviceName: 'Marriage & Family Therapy',
    specialties: ['relationship', 'family', 'couples'],
    fee: 350_000,
    description:
      'Therapeutic approach that helps couples and families improve communication and resolve conflicts.',
    practitionerRoleId: 'PractitionerRole/pr-5',
    healthcareServiceId: 'HealthcareService/hs-5'
  }
];
