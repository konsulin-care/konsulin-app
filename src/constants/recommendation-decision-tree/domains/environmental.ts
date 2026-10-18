import type { DecisionDomain } from '@/types/recommendation-interview';
import { SEHAT_JIWA } from '../resources';

/** Environmental & Contextual domain branches. */
const environmental: DecisionDomain = {
  code: 'environmental-contextual',
  label: 'Environmental & Contextual',
  labelKey: 'domain_environmental-contextual',
  complaints: [
    {
      id: 'caregiver-strain',
      label: 'Caregiver Stress & Strain',
      labelKey: 'complaint_caregiver-strain',
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
        {
          id: 'caring-for-parent',
          label: 'Caring for an ageing parent',
          labelKey: 'option_caregiver-strain_caring-for-parent'
        },
        {
          id: 'special-needs-child',
          label: 'Caring for a child with special needs',
          labelKey: 'option_caregiver-strain_special-needs-child'
        },
        {
          id: 'elderly-spouse-care',
          label: 'Caring for a spouse with illness',
          labelKey: 'option_caregiver-strain_elderly-spouse-care'
        },
        {
          id: 'caregiver-other',
          label: 'Other caregiver concern',
          labelKey: 'option_caregiver-strain_caregiver-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is caregiving making you unable to rest?',
        labelKey: 'redflag_caregiver-strain',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'financial-stress',
      label: 'Financial Stress & Worry',
      labelKey: 'complaint_financial-stress',
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
        {
          id: 'debt-pressure',
          label: 'Pressure from debt',
          labelKey: 'option_financial-stress_debt-pressure'
        },
        {
          id: 'job-insecurity',
          label: 'Worry about job or income',
          labelKey: 'option_financial-stress_job-insecurity'
        },
        {
          id: 'budgeting-overwhelm',
          label: 'Overwhelmed by budgeting',
          labelKey: 'option_financial-stress_budgeting-overwhelm'
        },
        {
          id: 'financial-other',
          label: 'Other financial concern',
          labelKey: 'option_financial-stress_financial-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is financial worry keeping you from functioning?',
        labelKey: 'redflag_financial-stress',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'relocation-adjustment',
      label: 'Relocation & Cultural Adjustment',
      labelKey: 'complaint_relocation-adjustment',
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
        {
          id: 'moving-cities',
          label: 'Moved to a new city',
          labelKey: 'option_relocation-adjustment_moving-cities'
        },
        {
          id: 'moving-abroad',
          label: 'Moved to another country',
          labelKey: 'option_relocation-adjustment_moving-abroad'
        },
        {
          id: 'returning-home',
          label: 'Returned home after a long time',
          labelKey: 'option_relocation-adjustment_returning-home'
        },
        {
          id: 'relocation-other',
          label: 'Other relocation concern',
          labelKey: 'option_relocation-adjustment_relocation-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is the adjustment feeling overwhelming?',
        labelKey: 'redflag_relocation-adjustment',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'ergonomic-strain',
      label: 'Workplace & Ergonomic Strain',
      labelKey: 'complaint_ergonomic-strain',
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
        {
          id: 'desk-posture',
          label: 'Pain from desk posture',
          labelKey: 'option_ergonomic-strain_desk-posture'
        },
        {
          id: 'repetitive-strain',
          label: 'Repetitive strain at work',
          labelKey: 'option_ergonomic-strain_repetitive-strain'
        },
        {
          id: 'screen-eye-strain',
          label: 'Eye strain from screens',
          labelKey: 'option_ergonomic-strain_screen-eye-strain'
        },
        {
          id: 'ergonomic-other',
          label: 'Other ergonomic concern',
          labelKey: 'option_ergonomic-strain_ergonomic-other',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is the strain affecting your work hours?',
        labelKey: 'redflag_ergonomic-strain',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'other-environmental',
      label: 'Other Environmental Concern',
      labelKey: 'complaint_other-environmental',
      synonyms: ['lingkungan', 'environmental', 'lain'],
      icfDomain: 'environmental-contextual',
      keywords: ['environmental', 'workplace', 'general'],
      serviceTypeCode: 'other-environmental-contextual',
      options: [
        {
          id: 'other-environmental',
          label: 'Another environmental concern',
          labelKey: 'option_other-environmental_other-environmental',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this affecting your daily life?',
        labelKey: 'redflag_other-environmental',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default environmental;
