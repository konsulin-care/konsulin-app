import type { DecisionDomain } from '@/types/recommendation-interview';
import { ER, SAPA129, SEHAT_JIWA } from '../resources';

/** Social Health & Relationships domain branches. */
const social: DecisionDomain = {
  code: 'social-health-relationships',
  label: 'Social Health & Relationships',
  labelKey: 'domain_social-health-relationships',
  complaints: [
    {
      id: 'couple-conflict',
      label: 'Marriage & Partner Conflict',
      labelKey: 'complaint_couple-conflict',
      synonyms: [
        'pasangan',
        'suami',
        'istri',
        'couple',
        'marriage',
        'rumah tangga'
      ],
      icfDomain: 'social-health-relationships',
      keywords: [
        'couple',
        'marital',
        'marriage',
        'conflict',
        'communication',
        'family',
        'therapy'
      ],
      serviceTypeCode: 'couples-therapy',
      options: [
        {
          id: 'communication-breakdown',
          label: 'Constant arguments',
          labelKey: 'option_couple-conflict_communication-breakdown'
        },
        {
          id: 'trust-issues',
          label: 'Lost trust between you',
          labelKey: 'option_couple-conflict_trust-issues'
        },
        {
          id: 'infidelity',
          label: 'Impact of infidelity',
          labelKey: 'option_couple-conflict_infidelity'
        },
        {
          id: 'separation-thinking',
          label: 'Thinking about separating',
          labelKey: 'option_couple-conflict_separation-thinking'
        },
        {
          id: 'couple-other',
          label: 'Other relationship concern',
          labelKey: 'option_couple-conflict_couple-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Are you experiencing violence or feeling unsafe at home?',
        labelKey: 'redflag_couple-conflict',
        resources: [SAPA129, ER]
      }
    },
    {
      id: 'family-dynamics',
      label: 'Family & Parent-Child Conflict',
      labelKey: 'complaint_family-dynamics',
      synonyms: ['keluarga', 'anak', 'family', 'parent', 'orang tua'],
      icfDomain: 'social-health-relationships',
      keywords: [
        'family',
        'parent',
        'parenting',
        'conflict',
        'communication',
        'relationship',
        'therapy'
      ],
      serviceTypeCode: 'family-therapy',
      options: [
        {
          id: 'parent-child-conflict',
          label: 'Conflict with a child',
          labelKey: 'option_family-dynamics_parent-child-conflict'
        },
        {
          id: 'sibling-conflict',
          label: 'Tension between siblings',
          labelKey: 'option_family-dynamics_sibling-conflict'
        },
        {
          id: 'in-law-tension',
          label: 'Tension with in-laws',
          labelKey: 'option_family-dynamics_in-law-tension'
        },
        {
          id: 'family-other',
          label: 'Other family concern',
          labelKey: 'option_family-dynamics_family-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Is there violence between family members?',
        labelKey: 'redflag_family-dynamics',
        resources: [SAPA129, ER]
      }
    },
    {
      id: 'workplace-conflict',
      label: 'Workplace Interpersonal Tension',
      labelKey: 'complaint_workplace-conflict',
      synonyms: ['kerja', 'kantor', 'rekan', 'workplace', 'colleague', 'boss'],
      icfDomain: 'social-health-relationships',
      keywords: [
        'workplace',
        'conflict',
        'communication',
        'stress',
        'employment',
        'interpersonal'
      ],
      serviceTypeCode: 'workplace-counseling',
      options: [
        {
          id: 'boss-conflict',
          label: 'Conflict with a supervisor',
          labelKey: 'option_workplace-conflict_boss-conflict'
        },
        {
          id: 'coworker-conflict',
          label: 'Conflict with coworkers',
          labelKey: 'option_workplace-conflict_coworker-conflict'
        },
        {
          id: 'bullying',
          label: 'Bullying or harassment',
          labelKey: 'option_workplace-conflict_bullying'
        },
        {
          id: 'workplace-other',
          label: 'Other workplace concern',
          labelKey: 'option_workplace-conflict_workplace-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this conflict affecting your safety at work?',
        labelKey: 'redflag_workplace-conflict',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'loneliness-isolation',
      label: 'Loneliness & Social Isolation',
      labelKey: 'complaint_loneliness-isolation',
      synonyms: ['kesepian', 'sunyi', 'lonely', 'isolated', 'sendiri'],
      icfDomain: 'social-health-relationships',
      keywords: [
        'loneliness',
        'lonely',
        'isolation',
        'emotional',
        'psychological',
        'social'
      ],
      serviceTypeCode: 'social-support',
      options: [
        {
          id: 'chronic-loneliness',
          label: 'Feeling lonely most of the time',
          labelKey: 'option_loneliness-isolation_chronic-loneliness'
        },
        {
          id: 'friend-loss',
          label: 'Lost close friendships',
          labelKey: 'option_loneliness-isolation_friend-loss'
        },
        {
          id: 'social-withdrawal',
          label: 'Withdrawing from people',
          labelKey: 'option_loneliness-isolation_social-withdrawal'
        },
        {
          id: 'loneliness-other',
          label: 'Other loneliness concern',
          labelKey: 'option_loneliness-isolation_loneliness-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Does being alone feel unbearable right now?',
        labelKey: 'redflag_loneliness-isolation',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'communication-barriers',
      label: 'Communication Barriers',
      labelKey: 'complaint_communication-barriers',
      synonyms: ['komunikasi', 'mengungkapkan', 'communication', 'express'],
      icfDomain: 'social-health-relationships',
      keywords: [
        'communication',
        'interaction',
        'interpersonal',
        'conflict',
        'psychological',
        'mental'
      ],
      serviceTypeCode: 'interpersonal-counseling',
      options: [
        {
          id: 'assertiveness',
          label: 'Difficulty saying no',
          labelKey: 'option_communication-barriers_assertiveness'
        },
        {
          id: 'conflict-avoidance',
          label: 'Avoiding hard conversations',
          labelKey: 'option_communication-barriers_conflict-avoidance'
        },
        {
          id: 'expressing-needs',
          label: 'Struggling to name my needs',
          labelKey: 'option_communication-barriers_expressing-needs'
        },
        {
          id: 'communication-other',
          label: 'Other communication concern',
          labelKey: 'option_communication-barriers_communication-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is poor communication putting you in danger?',
        labelKey: 'redflag_communication-barriers',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'other-social',
      label: 'Other Relationship Concern',
      labelKey: 'complaint_other-social',
      synonyms: ['hubungan', 'relationship', 'social'],
      icfDomain: 'social-health-relationships',
      keywords: ['relationship', 'social', 'psychological'],
      serviceTypeCode: 'other-social-health-relationships',
      options: [
        {
          id: 'other-social',
          label: 'Another relationship concern',
          labelKey: 'option_other-social_other-social',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your daily functioning?',
        labelKey: 'redflag_other-social',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default social;
