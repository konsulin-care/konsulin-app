import type { DecisionDomain } from '@/types/recommendation-interview';
import { SEHAT_JIWA } from '../resources';

/** Meaning, Purpose & Fulfilment domain branches. */
const meaning: DecisionDomain = {
  code: 'meaning-purpose-fulfilment',
  label: 'Meaning, Purpose & Fulfilment',
  complaints: [
    {
      id: 'career-direction',
      label: 'Career Crossroads & Direction',
      synonyms: ['karier', 'karir', 'career', 'arah hidup', 'buntu'],
      icfDomain: 'meaning-purpose-fulfilment',
      keywords: [
        'career',
        'direction',
        'vocation',
        'motivation',
        'confidence',
        'psychological',
        'mental',
        'behavioral'
      ],
      serviceTypeCode: 'career-counseling',
      options: [
        { id: 'stuck-in-job', label: 'Feeling stuck in my job' },
        { id: 'career-change', label: 'Thinking about changing careers' },
        { id: 'unclear-goals', label: 'No clarity on my direction' },
        { id: 'career-other', label: 'Other career concern', isOther: true }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this leaving you in deep distress?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'existential-purpose',
      label: 'Existential Questions & Life Purpose',
      synonyms: [
        'makna hidup',
        'tujuan hidup',
        'existential',
        'purpose',
        'arti'
      ],
      icfDomain: 'meaning-purpose-fulfilment',
      keywords: [
        'purpose',
        'existential',
        'life',
        'identity',
        'meaning',
        'psychological',
        'mental'
      ],
      serviceTypeCode: 'existential-therapy',
      options: [
        { id: 'meaning-of-life', label: 'Questioning the meaning of life' },
        { id: 'loss-of-purpose', label: 'Lost my sense of purpose' },
        { id: 'identity-crisis', label: 'Unsure who I am anymore' },
        {
          id: 'existential-other',
          label: 'Other existential concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Are these thoughts making you feel hopeless?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'life-transition',
      label: 'Life Transitions & Adjustment',
      synonyms: [
        'transisi',
        'lulus',
        'pensiun',
        'transition',
        'move',
        'pindah'
      ],
      icfDomain: 'meaning-purpose-fulfilment',
      keywords: [
        'transition',
        'retirement',
        'relocation',
        'life',
        'stress',
        'emotional',
        'psychological'
      ],
      serviceTypeCode: 'transition-counseling',
      options: [
        { id: 'graduation', label: 'Graduating or starting work' },
        { id: 'retirement', label: 'Retirement or finishing a chapter' },
        { id: 'relocation', label: 'Moving to a new place' },
        {
          id: 'relationship-ending',
          label: 'Ending a significant relationship'
        },
        {
          id: 'transition-other',
          label: 'Other transition concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this change overwhelming you?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'motivation-selfesteem',
      label: 'Low Motivation & Self-Esteem',
      synonyms: [
        'motivasi',
        'percaya diri',
        'self esteem',
        'motivation',
        'malas'
      ],
      icfDomain: 'meaning-purpose-fulfilment',
      keywords: [
        'motivation',
        'self-esteem',
        'self-worth',
        'confidence',
        'impostor',
        'worth',
        'psychological'
      ],
      serviceTypeCode: 'motivation-coaching',
      options: [
        { id: 'low-self-worth', label: 'Feeling not good enough' },
        { id: 'motivational-paralysis', label: "Can't seem to start anything" },
        { id: 'impostor-feelings', label: 'Feeling like a fraud' },
        {
          id: 'motivation-other',
          label: 'Other motivation concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this making you feel worthless?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'other-purpose',
      label: 'Other Purpose Concern',
      synonyms: ['meaning', 'purpose', 'lain'],
      icfDomain: 'meaning-purpose-fulfilment',
      keywords: ['purpose', 'meaning', 'goal'],
      serviceTypeCode: 'other-meaning-purpose-fulfilment',
      options: [
        { id: 'other-purpose', label: 'Another purpose concern', isOther: true }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your motivation to keep going?',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default meaning;
