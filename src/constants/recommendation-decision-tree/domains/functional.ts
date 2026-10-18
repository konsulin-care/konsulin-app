import type { DecisionDomain } from '@/types/recommendation-interview';
import { ER, SEHAT_JIWA } from '../resources';

/** Functional Capacity domain branches. */
const functional: DecisionDomain = {
  code: 'functional-capacity',
  label: 'Functional Capacity',
  labelKey: 'domain_functional-capacity',
  complaints: [
    {
      id: 'focus-attention',
      label: 'Focus, Attention & ADHD',
      labelKey: 'complaint_focus-attention',
      synonyms: [
        'fokus',
        'sulit konsentrasi',
        'adhd',
        'attention',
        'konsentrasi'
      ],
      icfDomain: 'functional-capacity',
      keywords: [
        'attention',
        'focus',
        'concentration',
        'behavior',
        'cognitive',
        'hyperactivity',
        'functioning'
      ],
      serviceTypeCode: 'cognitive-assessment',
      options: [
        {
          id: 'inattention',
          label: 'Hard to stay focused',
          labelKey: 'option_focus-attention_inattention'
        },
        {
          id: 'hyperactivity',
          label: 'Restlessness or impulsivity',
          labelKey: 'option_focus-attention_hyperactivity'
        },
        {
          id: 'adult-adhd',
          label: 'Possible adult ADHD',
          labelKey: 'option_focus-attention_adult-adhd'
        },
        {
          id: 'focus-other',
          label: 'Other focus concern',
          labelKey: 'option_focus-attention_focus-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your safety (e.g., driving or work)?',
        labelKey: 'redflag_focus-attention',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'memory-decline',
      label: 'Memory Loss & Cognitive Decline',
      labelKey: 'complaint_memory-decline',
      synonyms: ['memori', 'lupa', 'memory', 'pelupa', 'cognitive'],
      icfDomain: 'functional-capacity',
      keywords: [
        'memory',
        'cognitive',
        'brain',
        'dementia',
        'forgetting',
        'functioning',
        'neurological'
      ],
      serviceTypeCode: 'neuro-assessment',
      options: [
        {
          id: 'short-term-memory',
          label: 'Forgetting recent things',
          labelKey: 'option_memory-decline_short-term-memory'
        },
        {
          id: 'concentration-gaps',
          label: 'Gaps in concentration',
          labelKey: 'option_memory-decline_concentration-gaps'
        },
        {
          id: 'word-finding',
          label: 'Difficulty finding words',
          labelKey: 'option_memory-decline_word-finding'
        },
        {
          id: 'memory-other',
          label: 'Other memory concern',
          labelKey: 'option_memory-decline_memory-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Did confusion or memory loss start suddenly?',
        labelKey: 'redflag_memory-decline',
        resources: [ER]
      }
    },
    {
      id: 'daily-activities',
      label: 'Difficulty with Daily Activities',
      labelKey: 'complaint_daily-activities',
      synonyms: [
        'aktivitas harian',
        'self care',
        'mandiri',
        'daily activities'
      ],
      icfDomain: 'functional-capacity',
      keywords: [
        'daily',
        'self-care',
        'function',
        'independence',
        'mobility',
        'rehabilitation'
      ],
      serviceTypeCode: 'occupational-therapy',
      options: [
        {
          id: 'self-care',
          label: 'Struggling with self-care',
          labelKey: 'option_daily-activities_self-care'
        },
        {
          id: 'household-tasks',
          label: 'Struggling with household tasks',
          labelKey: 'option_daily-activities_household-tasks'
        },
        {
          id: 'mobility-limits',
          label: 'Limited by physical abilities',
          labelKey: 'option_daily-activities_mobility-limits'
        },
        {
          id: 'daily-other',
          label: 'Other daily-activity concern',
          labelKey: 'option_daily-activities_daily-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Are you unable to get through basic tasks today?',
        labelKey: 'redflag_daily-activities',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'work-performance',
      label: 'Work & Study Performance Slump',
      labelKey: 'complaint_work-performance',
      synonyms: [
        'kerja',
        'kuliah',
        'produktivitas',
        'study',
        'performance',
        'deadline'
      ],
      icfDomain: 'functional-capacity',
      keywords: [
        'performance',
        'focus',
        'concentration',
        'motivation',
        'confidence',
        'stress',
        'psychological',
        'mental'
      ],
      serviceTypeCode: 'performance-coaching',
      options: [
        {
          id: 'focus-difficulty',
          label: 'Trouble staying on task',
          labelKey: 'option_work-performance_focus-difficulty'
        },
        {
          id: 'deadline-stress',
          label: 'Missed deadlines or falling behind',
          labelKey: 'option_work-performance_deadline-stress'
        },
        {
          id: 'confidence-drop',
          label: 'Lost confidence in my abilities',
          labelKey: 'option_work-performance_confidence-drop'
        },
        {
          id: 'performance-other',
          label: 'Other performance concern',
          labelKey: 'option_work-performance_performance-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your job or studies critically?',
        labelKey: 'redflag_work-performance',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'mobility-balance',
      label: 'Mobility & Balance Limitations',
      labelKey: 'complaint_mobility-balance',
      synonyms: ['jalan', 'keseimbangan', 'mobility', 'balance', 'jatuh'],
      icfDomain: 'functional-capacity',
      keywords: [
        'mobility',
        'balance',
        'walking',
        'gait',
        'falls',
        'joint',
        'spine',
        'musculoskeletal'
      ],
      serviceTypeCode: 'mobility-rehab',
      options: [
        {
          id: 'walking-difficulty',
          label: 'Difficulty walking',
          labelKey: 'option_mobility-balance_walking-difficulty'
        },
        {
          id: 'balance-issues',
          label: 'Frequent balance problems',
          labelKey: 'option_mobility-balance_balance-issues'
        },
        {
          id: 'falls',
          label: 'Recent falls',
          labelKey: 'option_mobility-balance_falls'
        },
        {
          id: 'mobility-other',
          label: 'Other mobility concern',
          labelKey: 'option_mobility-balance_mobility-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: true,
        label:
          'Do you have sudden facial droop, arm weakness or slurred speech?',
        labelKey: 'redflag_mobility-balance',
        resources: [ER]
      }
    },
    {
      id: 'other-functional',
      label: 'Other Functional Concern',
      labelKey: 'complaint_other-functional',
      synonyms: ['fungsi', 'functional', 'lain'],
      icfDomain: 'functional-capacity',
      keywords: ['function', 'daily', 'general'],
      serviceTypeCode: 'other-functional-capacity',
      options: [
        {
          id: 'other-functional',
          label: 'Another functional concern',
          labelKey: 'option_other-functional_other-functional',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your independence?',
        labelKey: 'redflag_other-functional',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default functional;
