import type { DecisionDomain } from '@/types/recommendation-interview';
import { SEHAT_JIWA } from '../resources';

/** Meaning, Purpose & Fulfilment domain branches. */
const meaning: DecisionDomain = {
  code: 'meaning-purpose-fulfilment',
  label: 'Meaning, Purpose & Fulfilment',
  labelKey: 'domain_meaning-purpose-fulfilment',
  complaints: [
    {
      id: 'career-direction',
      label: 'Career Crossroads & Direction',
      labelKey: 'complaint_career-direction',
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
        {
          id: 'stuck-in-job',
          label: 'Feeling stuck in my job',
          labelKey: 'option_career-direction_stuck-in-job'
        },
        {
          id: 'career-change',
          label: 'Thinking about changing careers',
          labelKey: 'option_career-direction_career-change'
        },
        {
          id: 'unclear-goals',
          label: 'No clarity on my direction',
          labelKey: 'option_career-direction_unclear-goals'
        },
        {
          id: 'career-other',
          label: 'Other career concern',
          labelKey: 'option_career-direction_career-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this leaving you in deep distress?',
        labelKey: 'redflag_career-direction',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'existential-purpose',
      label: 'Existential Questions & Life Purpose',
      labelKey: 'complaint_existential-purpose',
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
        {
          id: 'meaning-of-life',
          label: 'Questioning the meaning of life',
          labelKey: 'option_existential-purpose_meaning-of-life'
        },
        {
          id: 'loss-of-purpose',
          label: 'Lost my sense of purpose',
          labelKey: 'option_existential-purpose_loss-of-purpose'
        },
        {
          id: 'identity-crisis',
          label: 'Unsure who I am anymore',
          labelKey: 'option_existential-purpose_identity-crisis'
        },
        {
          id: 'existential-other',
          label: 'Other existential concern',
          labelKey: 'option_existential-purpose_existential-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Are these thoughts making you feel hopeless?',
        labelKey: 'redflag_existential-purpose',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'life-transition',
      label: 'Life Transitions & Adjustment',
      labelKey: 'complaint_life-transition',
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
        {
          id: 'graduation',
          label: 'Graduating or starting work',
          labelKey: 'option_life-transition_graduation'
        },
        {
          id: 'retirement',
          label: 'Retirement or finishing a chapter',
          labelKey: 'option_life-transition_retirement'
        },
        {
          id: 'relocation',
          label: 'Moving to a new place',
          labelKey: 'option_life-transition_relocation'
        },
        {
          id: 'relationship-ending',
          label: 'Ending a significant relationship',
          labelKey: 'option_life-transition_relationship-ending'
        },
        {
          id: 'transition-other',
          label: 'Other transition concern',
          labelKey: 'option_life-transition_transition-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this change overwhelming you?',
        labelKey: 'redflag_life-transition',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'motivation-selfesteem',
      label: 'Low Motivation & Self-Esteem',
      labelKey: 'complaint_motivation-selfesteem',
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
        {
          id: 'low-self-worth',
          label: 'Feeling not good enough',
          labelKey: 'option_motivation-selfesteem_low-self-worth'
        },
        {
          id: 'motivational-paralysis',
          label: "Can't seem to start anything",
          labelKey: 'option_motivation-selfesteem_motivational-paralysis'
        },
        {
          id: 'impostor-feelings',
          label: 'Feeling like a fraud',
          labelKey: 'option_motivation-selfesteem_impostor-feelings'
        },
        {
          id: 'motivation-other',
          label: 'Other motivation concern',
          labelKey: 'option_motivation-selfesteem_motivation-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this making you feel worthless?',
        labelKey: 'redflag_motivation-selfesteem',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'other-purpose',
      label: 'Other Purpose Concern',
      labelKey: 'complaint_other-purpose',
      synonyms: ['meaning', 'purpose', 'lain'],
      icfDomain: 'meaning-purpose-fulfilment',
      keywords: ['purpose', 'meaning', 'goal'],
      serviceTypeCode: 'other-meaning-purpose-fulfilment',
      options: [
        {
          id: 'other-purpose',
          label: 'Another purpose concern',
          labelKey: 'option_other-purpose_other-purpose',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your motivation to keep going?',
        labelKey: 'redflag_other-purpose',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default meaning;
