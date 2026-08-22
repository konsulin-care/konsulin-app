import type { DecisionDomain } from '@/types/recommendation-interview';
import { SEHAT_JIWA } from '../resources';

/** Environmental & Contextual domain branches. */
const environmental: DecisionDomain = {
  code: 'environmental-contextual',
  label: 'Environmental & Contextual',
  complaints: [
    {
      id: 'caregiver-strain',
      label: 'Caregiver Stress & Strain',
      synonyms: ['perawat', 'mengurus', 'caregiver', 'merawat orang tua'],
      icfDomain: 'environmental-contextual',
      keywords: [
        'caregiver',
        'caregiving',
        'caring',
        'elderly',
        'stress',
        'emotional',
        'exhaustion'
      ],
      serviceTypeCode: 'caregiver-support',
      options: [
        { id: 'caring-for-parent', label: 'Caring for an ageing parent' },
        {
          id: 'special-needs-child',
          label: 'Caring for a child with special needs'
        },
        {
          id: 'elderly-spouse-care',
          label: 'Caring for a spouse with illness'
        },
        {
          id: 'caregiver-other',
          label: 'Other caregiver concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is caregiving making you unable to rest?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'financial-stress',
      label: 'Financial Stress & Worry',
      synonyms: ['keuangan', 'utang', 'finansial', 'financial', 'money'],
      icfDomain: 'environmental-contextual',
      keywords: [
        'financial',
        'debt',
        'income',
        'stress',
        'anxiety',
        'psychological'
      ],
      serviceTypeCode: 'financial-wellbeing',
      options: [
        { id: 'debt-pressure', label: 'Pressure from debt' },
        { id: 'job-insecurity', label: 'Worry about job or income' },
        { id: 'budgeting-overwhelm', label: 'Overwhelmed by budgeting' },
        {
          id: 'financial-other',
          label: 'Other financial concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is financial worry keeping you from functioning?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'relocation-adjustment',
      label: 'Relocation & Cultural Adjustment',
      synonyms: [
        'pindah',
        'adaptasi',
        'kultur',
        'relocation',
        'culture',
        'adjustment'
      ],
      icfDomain: 'environmental-contextual',
      keywords: [
        'relocation',
        'moving',
        'transition',
        'stress',
        'emotional',
        'psychological'
      ],
      serviceTypeCode: 'adjustment-counseling',
      options: [
        { id: 'moving-cities', label: 'Moved to a new city' },
        { id: 'moving-abroad', label: 'Moved to another country' },
        { id: 'returning-home', label: 'Returned home after a long time' },
        {
          id: 'relocation-other',
          label: 'Other relocation concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is the adjustment feeling overwhelming?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'ergonomic-strain',
      label: 'Workplace & Ergonomic Strain',
      synonyms: ['ergonomi', 'postur', 'duduk', 'ergonomic', 'posture'],
      icfDomain: 'environmental-contextual',
      keywords: [
        'ergonomic',
        'posture',
        'repetitive',
        'screen',
        'neck',
        'spine',
        'musculoskeletal'
      ],
      serviceTypeCode: 'ergonomic-care',
      options: [
        { id: 'desk-posture', label: 'Pain from desk posture' },
        { id: 'repetitive-strain', label: 'Repetitive strain at work' },
        { id: 'screen-eye-strain', label: 'Eye strain from screens' },
        {
          id: 'ergonomic-other',
          label: 'Other ergonomic concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is the strain affecting your work hours?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'other-environmental',
      label: 'Other Environmental Concern',
      synonyms: ['lingkungan', 'environmental', 'lain'],
      icfDomain: 'environmental-contextual',
      keywords: ['environmental', 'workplace', 'general'],
      serviceTypeCode: 'other-environmental-contextual',
      options: [
        {
          id: 'other-environmental',
          label: 'Another environmental concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your daily life?',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default environmental;
