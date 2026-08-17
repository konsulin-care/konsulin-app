import type { DecisionDomain } from '@/types/recommendation-interview';
import { ER, SEHAT_JIWA } from '../resources';

/** Functional Capacity domain branches. */
const functional: DecisionDomain = {
  code: 'functional-capacity',
  label: 'Functional Capacity',
  complaints: [
    {
      id: 'focus-attention',
      label: 'Focus, Attention & ADHD',
      synonyms: [
        'fokus',
        'sulit konsentrasi',
        'adhd',
        'attention',
        'konsentrasi'
      ],
      icfDomain: 'functional-capacity',
      specialty: 'neuropsychology',
      serviceTypeCode: 'cognitive-assessment',
      options: [
        { id: 'inattention', label: 'Hard to stay focused' },
        { id: 'hyperactivity', label: 'Restlessness or impulsivity' },
        { id: 'adult-adhd', label: 'Possible adult ADHD' },
        { id: 'focus-other', label: 'Other focus concern', isOther: true }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your safety (e.g., driving or work)?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'memory-decline',
      label: 'Memory Loss & Cognitive Decline',
      synonyms: ['memori', 'lupa', 'memory', 'pelupa', 'cognitive'],
      icfDomain: 'functional-capacity',
      specialty: 'neuropsychology',
      serviceTypeCode: 'neuro-assessment',
      options: [
        { id: 'short-term-memory', label: 'Forgetting recent things' },
        { id: 'concentration-gaps', label: 'Gaps in concentration' },
        { id: 'word-finding', label: 'Difficulty finding words' },
        { id: 'memory-other', label: 'Other memory concern', isOther: true }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Did confusion or memory loss start suddenly?',
        resources: [ER]
      }
    },
    {
      id: 'daily-activities',
      label: 'Difficulty with Daily Activities',
      synonyms: [
        'aktivitas harian',
        'self care',
        'mandiri',
        'daily activities'
      ],
      icfDomain: 'functional-capacity',
      specialty: 'neuropsychology',
      serviceTypeCode: 'occupational-therapy',
      options: [
        { id: 'self-care', label: 'Struggling with self-care' },
        { id: 'household-tasks', label: 'Struggling with household tasks' },
        { id: 'mobility-limits', label: 'Limited by physical abilities' },
        {
          id: 'daily-other',
          label: 'Other daily-activity concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Are you unable to get through basic tasks today?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'work-performance',
      label: 'Work & Study Performance Slump',
      synonyms: [
        'kerja',
        'kuliah',
        'produktivitas',
        'study',
        'performance',
        'deadline'
      ],
      icfDomain: 'functional-capacity',
      specialty: 'psychology',
      serviceTypeCode: 'performance-coaching',
      options: [
        { id: 'focus-difficulty', label: 'Trouble staying on task' },
        { id: 'deadline-stress', label: 'Missed deadlines or falling behind' },
        { id: 'confidence-drop', label: 'Lost confidence in my abilities' },
        {
          id: 'performance-other',
          label: 'Other performance concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your job or studies critically?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'mobility-balance',
      label: 'Mobility & Balance Limitations',
      synonyms: ['jalan', 'keseimbangan', 'mobility', 'balance', 'jatuh'],
      icfDomain: 'functional-capacity',
      specialty: 'orthopedics',
      serviceTypeCode: 'mobility-rehab',
      options: [
        { id: 'walking-difficulty', label: 'Difficulty walking' },
        { id: 'balance-issues', label: 'Frequent balance problems' },
        { id: 'falls', label: 'Recent falls' },
        { id: 'mobility-other', label: 'Other mobility concern', isOther: true }
      ],
      redFlag: {
        isEmergency: true,
        label:
          'Do you have sudden facial droop, arm weakness or slurred speech?',
        resources: [ER]
      }
    },
    {
      id: 'other-functional',
      label: 'Other Functional Concern',
      synonyms: ['fungsi', 'functional', 'lain'],
      icfDomain: 'functional-capacity',
      specialty: 'general-practice',
      serviceTypeCode: 'other-functional-capacity',
      options: [
        {
          id: 'other-functional',
          label: 'Another functional concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your independence?',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default functional;
