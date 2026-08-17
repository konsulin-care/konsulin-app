import type { DecisionDomain } from '@/types/recommendation-interview';
import { ER, SAPA129, SEHAT_JIWA } from '../resources';

/** Social Health & Relationships domain branches. */
const social: DecisionDomain = {
  code: 'social-health-relationships',
  label: 'Social Health & Relationships',
  complaints: [
    {
      id: 'couple-conflict',
      label: 'Marriage & Partner Conflict',
      synonyms: [
        'pasangan',
        'suami',
        'istri',
        'couple',
        'marriage',
        'rumah tangga'
      ],
      icfDomain: 'social-health-relationships',
      specialty: 'psychology',
      serviceTypeCode: 'couples-therapy',
      options: [
        { id: 'communication-breakdown', label: 'Constant arguments' },
        { id: 'trust-issues', label: 'Lost trust between you' },
        { id: 'infidelity', label: 'Impact of infidelity' },
        { id: 'separation-thinking', label: 'Thinking about separating' },
        {
          id: 'couple-other',
          label: 'Other relationship concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Are you experiencing violence or feeling unsafe at home?',
        resources: [SAPA129, ER]
      }
    },
    {
      id: 'family-dynamics',
      label: 'Family & Parent-Child Conflict',
      synonyms: ['keluarga', 'anak', 'family', 'parent', 'orang tua'],
      icfDomain: 'social-health-relationships',
      specialty: 'psychology',
      serviceTypeCode: 'family-therapy',
      options: [
        { id: 'parent-child-conflict', label: 'Conflict with a child' },
        { id: 'sibling-conflict', label: 'Tension between siblings' },
        { id: 'in-law-tension', label: 'Tension with in-laws' },
        { id: 'family-other', label: 'Other family concern', isOther: true }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Is there violence between family members?',
        resources: [SAPA129, ER]
      }
    },
    {
      id: 'workplace-conflict',
      label: 'Workplace Interpersonal Tension',
      synonyms: ['kerja', 'kantor', 'rekan', 'workplace', 'colleague', 'boss'],
      icfDomain: 'social-health-relationships',
      specialty: 'psychology',
      serviceTypeCode: 'workplace-counseling',
      options: [
        { id: 'boss-conflict', label: 'Conflict with a supervisor' },
        { id: 'coworker-conflict', label: 'Conflict with coworkers' },
        { id: 'bullying', label: 'Bullying or harassment' },
        {
          id: 'workplace-other',
          label: 'Other workplace concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this conflict affecting your safety at work?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'loneliness-isolation',
      label: 'Loneliness & Social Isolation',
      synonyms: ['kesepian', 'sunyi', 'lonely', 'isolated', 'sendiri'],
      icfDomain: 'social-health-relationships',
      specialty: 'psychology',
      serviceTypeCode: 'social-support',
      options: [
        { id: 'chronic-loneliness', label: 'Feeling lonely most of the time' },
        { id: 'friend-loss', label: 'Lost close friendships' },
        { id: 'social-withdrawal', label: 'Withdrawing from people' },
        {
          id: 'loneliness-other',
          label: 'Other loneliness concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Does being alone feel unbearable right now?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'communication-barriers',
      label: 'Communication Barriers',
      synonyms: ['komunikasi', 'mengungkapkan', 'communication', 'express'],
      icfDomain: 'social-health-relationships',
      specialty: 'psychology',
      serviceTypeCode: 'interpersonal-counseling',
      options: [
        { id: 'assertiveness', label: 'Difficulty saying no' },
        { id: 'conflict-avoidance', label: 'Avoiding hard conversations' },
        { id: 'expressing-needs', label: 'Struggling to name my needs' },
        {
          id: 'communication-other',
          label: 'Other communication concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is poor communication putting you in danger?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'other-social',
      label: 'Other Relationship Concern',
      synonyms: ['hubungan', 'relationship', 'social'],
      icfDomain: 'social-health-relationships',
      specialty: 'psychology',
      serviceTypeCode: 'other-social-health-relationships',
      options: [
        {
          id: 'other-social',
          label: 'Another relationship concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your daily functioning?',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default social;
