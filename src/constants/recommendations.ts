export interface Recommendation {
  id: string;
  photoUrl: string;
  name: string;
  serviceName: string;
  specialties: string[];
  fee: number;
}

export const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'practitioner-1',
    photoUrl: '',
    name: 'dr. Sarah Chen',
    serviceName: 'Smoking-Cessation Counselling',
    specialties: ['addiction', 'substance use'],
    fee: 500000
  },
  {
    id: 'practitioner-2',
    photoUrl: '',
    name: 'dr. Budi Santoso',
    serviceName: 'Cognitive Behavioral Therapy',
    specialties: ['anxiety', 'depression', 'stress'],
    fee: 400000
  },
  {
    id: 'practitioner-3',
    photoUrl: '',
    name: 'dr. Maya Putri',
    serviceName: 'Child & Adolescent Psychology',
    specialties: ['pediatric', 'developmental'],
    fee: 450000
  },
  {
    id: 'practitioner-4',
    photoUrl: '',
    name: 'dr. Alex Turner',
    serviceName: 'Neuropsychology Assessment',
    specialties: ['neurology', 'cognitive'],
    fee: 600000
  },
  {
    id: 'practitioner-5',
    photoUrl: '',
    name: 'dr. Rina Wijaya',
    serviceName: 'Marriage & Family Therapy',
    specialties: ['relationship', 'family', 'couples'],
    fee: 350000
  }
];
