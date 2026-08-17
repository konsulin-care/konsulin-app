import type { DecisionDomain } from '@/types/recommendation-interview';
import { ER, SEHAT_JIWA } from '../resources';

/** Health Behaviours & Lifestyle domain branches. */
const lifestyle: DecisionDomain = {
  code: 'health-behaviours-lifestyle',
  label: 'Health Behaviours & Lifestyle',
  complaints: [
    {
      id: 'smoking-cessation',
      label: 'Quitting Smoking & Vaping',
      synonyms: ['merokok', 'rokok', 'vape', 'smoking', 'nicotine', 'berhenti'],
      icfDomain: 'health-behaviours-lifestyle',
      specialty: 'psychology',
      serviceTypeCode: 'smoking-cessation',
      options: [
        { id: 'daily-smoker', label: 'Smoke or vape every day' },
        { id: 'vaping', label: 'Try to quit vaping' },
        { id: 'relapse-prevention', label: 'Keep relapsing after quitting' },
        { id: 'smoking-other', label: 'Other smoking concern', isOther: true }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is tobacco affecting your daily health?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'alcohol-substance',
      label: 'Alcohol or Substance Use',
      synonyms: ['alkohol', 'minuman keras', 'narkoba', 'alcohol', 'substance'],
      icfDomain: 'health-behaviours-lifestyle',
      specialty: 'psychiatry',
      serviceTypeCode: 'substance-counseling',
      options: [
        { id: 'alcohol-dependence', label: 'Dependent on alcohol' },
        { id: 'drug-use', label: 'Using substances regularly' },
        { id: 'medication-abuse', label: 'Misusing medication' },
        {
          id: 'substance-other',
          label: 'Other substance concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Are you experiencing severe withdrawal or acute intoxication?',
        resources: [ER]
      }
    },
    {
      id: 'eating-weight',
      label: 'Eating Patterns & Weight',
      synonyms: [
        'makan',
        'diet',
        'berat badan',
        'eating',
        'weight',
        'pola makan'
      ],
      icfDomain: 'health-behaviours-lifestyle',
      specialty: 'psychology',
      serviceTypeCode: 'nutrition-coaching',
      options: [
        { id: 'emotional-eating', label: 'Eating when stressed or sad' },
        { id: 'disordered-eating', label: 'Unhealthy relationship with food' },
        { id: 'weight-management', label: 'Want help with weight' },
        { id: 'eating-other', label: 'Other eating concern', isOther: true }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is eating becoming a health emergency for you?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'sedentary-habits',
      label: 'Sedentary Lifestyle & New Habits',
      synonyms: [
        'olahraga',
        'malas gerak',
        'kebiasaan',
        'sedentary',
        'exercise',
        'habit'
      ],
      icfDomain: 'health-behaviours-lifestyle',
      specialty: 'general-practice',
      serviceTypeCode: 'behavior-change-coaching',
      options: [
        { id: 'starting-exercise', label: 'Want to start moving more' },
        { id: 'screen-time', label: 'Too much screen time' },
        { id: 'routine-building', label: 'Struggle to build routines' },
        { id: 'habit-other', label: 'Other habit concern', isOther: true }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is your current lifestyle causing you harm?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'other-lifestyle',
      label: 'Other Lifestyle Concern',
      synonyms: ['lifestyle', 'gaya hidup', 'lain'],
      icfDomain: 'health-behaviours-lifestyle',
      specialty: 'general-practice',
      serviceTypeCode: 'other-health-behaviours-lifestyle',
      options: [
        {
          id: 'other-lifestyle',
          label: 'Another lifestyle concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your daily routine?',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default lifestyle;
