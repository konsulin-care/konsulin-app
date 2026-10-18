import type { DecisionDomain } from '@/types/recommendation-interview';
import { ER, SEHAT_JIWA } from '../resources';

/** Health Behaviours & Lifestyle domain branches. */
const lifestyle: DecisionDomain = {
  code: 'health-behaviours-lifestyle',
  label: 'Health Behaviours & Lifestyle',
  labelKey: 'domain_health-behaviours-lifestyle',
  complaints: [
    {
      id: 'smoking-cessation',
      label: 'Quitting Smoking & Vaping',
      labelKey: 'complaint_smoking-cessation',
      synonyms: ['merokok', 'rokok', 'vape', 'smoking', 'nicotine', 'berhenti'],
      icfDomain: 'health-behaviours-lifestyle',
      keywords: [
        'smoking',
        'tobacco',
        'vaping',
        'nicotine',
        'cigarette',
        'addiction',
        'behavioral'
      ],
      serviceTypeCode: 'smoking-cessation',
      options: [
        {
          id: 'daily-smoker',
          label: 'Smoke or vape every day',
          labelKey: 'option_smoking-cessation_daily-smoker'
        },
        {
          id: 'vaping',
          label: 'Try to quit vaping',
          labelKey: 'option_smoking-cessation_vaping'
        },
        {
          id: 'relapse-prevention',
          label: 'Keep relapsing after quitting',
          labelKey: 'option_smoking-cessation_relapse-prevention'
        },
        {
          id: 'smoking-other',
          label: 'Other smoking concern',
          labelKey: 'option_smoking-cessation_smoking-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is tobacco affecting your daily health?',
        labelKey: 'redflag_smoking-cessation',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'alcohol-substance',
      label: 'Alcohol or Substance Use',
      labelKey: 'complaint_alcohol-substance',
      synonyms: ['alkohol', 'minuman keras', 'narkoba', 'alcohol', 'substance'],
      icfDomain: 'health-behaviours-lifestyle',
      keywords: [
        'alcohol',
        'drinking',
        'substance',
        'drug',
        'opioid',
        'addiction',
        'psychiatrist',
        'behavioral'
      ],
      serviceTypeCode: 'substance-counseling',
      options: [
        {
          id: 'alcohol-dependence',
          label: 'Dependent on alcohol',
          labelKey: 'option_alcohol-substance_alcohol-dependence'
        },
        {
          id: 'drug-use',
          label: 'Using substances regularly',
          labelKey: 'option_alcohol-substance_drug-use'
        },
        {
          id: 'medication-abuse',
          label: 'Misusing medication',
          labelKey: 'option_alcohol-substance_medication-abuse'
        },
        {
          id: 'substance-other',
          label: 'Other substance concern',
          labelKey: 'option_alcohol-substance_substance-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Are you experiencing severe withdrawal or acute intoxication?',
        labelKey: 'redflag_alcohol-substance',
        resources: [ER]
      }
    },
    {
      id: 'eating-weight',
      label: 'Eating Patterns & Weight',
      labelKey: 'complaint_eating-weight',
      synonyms: [
        'makan',
        'diet',
        'berat badan',
        'eating',
        'weight',
        'pola makan'
      ],
      icfDomain: 'health-behaviours-lifestyle',
      keywords: [
        'eating',
        'diet',
        'nutrition',
        'weight',
        'obesity',
        'appetite',
        'emotional',
        'psychological'
      ],
      serviceTypeCode: 'nutrition-coaching',
      options: [
        {
          id: 'emotional-eating',
          label: 'Eating when stressed or sad',
          labelKey: 'option_eating-weight_emotional-eating'
        },
        {
          id: 'disordered-eating',
          label: 'Unhealthy relationship with food',
          labelKey: 'option_eating-weight_disordered-eating'
        },
        {
          id: 'weight-management',
          label: 'Want help with weight',
          labelKey: 'option_eating-weight_weight-management'
        },
        {
          id: 'eating-other',
          label: 'Other eating concern',
          labelKey: 'option_eating-weight_eating-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is eating becoming a health emergency for you?',
        labelKey: 'redflag_eating-weight',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'sedentary-habits',
      label: 'Sedentary Lifestyle & New Habits',
      labelKey: 'complaint_sedentary-habits',
      synonyms: [
        'olahraga',
        'malas gerak',
        'kebiasaan',
        'sedentary',
        'exercise',
        'habit'
      ],
      icfDomain: 'health-behaviours-lifestyle',
      keywords: [
        'sedentary',
        'exercise',
        'fitness',
        'routine',
        'physical',
        'wellness',
        'general'
      ],
      serviceTypeCode: 'behavior-change-coaching',
      options: [
        {
          id: 'starting-exercise',
          label: 'Want to start moving more',
          labelKey: 'option_sedentary-habits_starting-exercise'
        },
        {
          id: 'screen-time',
          label: 'Too much screen time',
          labelKey: 'option_sedentary-habits_screen-time'
        },
        {
          id: 'routine-building',
          label: 'Struggle to build routines',
          labelKey: 'option_sedentary-habits_routine-building'
        },
        {
          id: 'habit-other',
          label: 'Other habit concern',
          labelKey: 'option_sedentary-habits_habit-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is your current lifestyle causing you harm?',
        labelKey: 'redflag_sedentary-habits',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'other-lifestyle',
      label: 'Other Lifestyle Concern',
      labelKey: 'complaint_other-lifestyle',
      synonyms: ['lifestyle', 'gaya hidup', 'lain'],
      icfDomain: 'health-behaviours-lifestyle',
      keywords: ['lifestyle', 'routine', 'habits'],
      serviceTypeCode: 'other-health-behaviours-lifestyle',
      options: [
        {
          id: 'other-lifestyle',
          label: 'Another lifestyle concern',
          labelKey: 'option_other-lifestyle_other-lifestyle',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your daily routine?',
        labelKey: 'redflag_other-lifestyle',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default lifestyle;
