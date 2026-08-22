import type { DecisionDomain } from '@/types/recommendation-interview';
import { ER, SEHAT_JIWA } from '../resources';

/** Mental & Emotional Health domain branches. */
const mental: DecisionDomain = {
  code: 'mental-emotional-health',
  label: 'Mental & Emotional Health',
  complaints: [
    {
      id: 'low-mood',
      label: 'Low Mood & Sadness',
      synonyms: [
        'sedih',
        'depresi',
        'depression',
        'down',
        'hopeless',
        'murung'
      ],
      icfDomain: 'mental-emotional-health',
      keywords: [
        'depression',
        'depressive',
        'mood',
        'hopelessness',
        'sad',
        'psychological',
        'stress'
      ],
      serviceTypeCode: 'mood-disorder-care',
      options: [
        { id: 'persistent-low-mood', label: 'Low mood most of the day' },
        { id: 'loss-of-interest', label: 'Lost interest in things I enjoyed' },
        { id: 'hopelessness', label: 'Feeling hopeless about the future' },
        { id: 'self-blame-guilt', label: 'Excessive guilt or self-blame' },
        { id: 'mood-other', label: 'Other mood concern', isOther: true }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Are you having thoughts of harming yourself?',
        resources: [SEHAT_JIWA, ER]
      }
    },
    {
      id: 'anxiety-stress',
      label: 'Anxiety, Stress & Panic',
      synonyms: ['cemas', 'khawatir', 'panik', 'anxiety', 'stress', 'panicky'],
      icfDomain: 'mental-emotional-health',
      keywords: [
        'anxiety',
        'anxious',
        'stress',
        'panic',
        'phobia',
        'psychological',
        'mental'
      ],
      serviceTypeCode: 'anxiety-care',
      options: [
        { id: 'general-worry', label: 'Constant worry or nervousness' },
        { id: 'panic-attacks', label: 'Panic attacks' },
        { id: 'social-anxiety', label: 'Anxiety in social situations' },
        { id: 'work-stress', label: 'Overwhelming stress' },
        { id: 'anxiety-other', label: 'Other anxiety concern', isOther: true }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Do you feel overwhelmingly unsafe or out of control right now?',
        resources: [SEHAT_JIWA, ER]
      }
    },
    {
      id: 'grief-trauma',
      label: 'Grief, Trauma & Bereavement',
      synonyms: ['duka', 'kehilangan', 'grief', 'trauma', 'berduka'],
      icfDomain: 'mental-emotional-health',
      keywords: [
        'grief',
        'trauma',
        'traumatic',
        'crisis',
        'abuse',
        'bereavement',
        'suicide',
        'psychological'
      ],
      serviceTypeCode: 'trauma-care',
      options: [
        { id: 'bereavement', label: 'Loss of a loved one' },
        { id: 'recent-trauma', label: 'Recovering from a traumatic event' },
        { id: 'ptsd-symptoms', label: 'Flashbacks or intrusive memories' },
        {
          id: 'grief-other',
          label: 'Other grief or trauma concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Are flashbacks or grief making daily life unbearable?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'postpartum-mood',
      label: 'Postpartum & Maternal Mood',
      synonyms: ['postpartum', 'melahirkan', 'baby blues', 'ibu baru'],
      icfDomain: 'mental-emotional-health',
      keywords: [
        'mood',
        'depression',
        'depressive',
        'stress',
        'psychological',
        'emotional'
      ],
      serviceTypeCode: 'perinatal-care',
      options: [
        { id: 'baby-blues', label: 'Mood swings after childbirth' },
        {
          id: 'postpartum-depression',
          label: 'Persistent sadness after birth'
        },
        { id: 'birth-trauma', label: 'Distress about the birth experience' },
        {
          id: 'postpartum-other',
          label: 'Other maternal mood concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Are you having thoughts of harming yourself or your baby?',
        resources: [SEHAT_JIWA, ER]
      }
    },
    {
      id: 'burnout',
      label: 'Emotional Exhaustion & Burnout',
      synonyms: ['burnout', 'kelelahan emosional', 'jenuh', 'lelah batin'],
      icfDomain: 'mental-emotional-health',
      keywords: [
        'burnout',
        'stress',
        'exhaustion',
        'psychological',
        'mental',
        'emotional'
      ],
      serviceTypeCode: 'burnout-care',
      options: [
        { id: 'work-burnout', label: 'Drained by work or study' },
        { id: 'caregiver-burnout', label: 'Drained by caregiving' },
        { id: 'apathy-loss-of-energy', label: 'Loss of energy and motivation' },
        {
          id: 'burnout-other',
          label: 'Other exhaustion concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Do you feel too exhausted to face the day?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'mood-swings',
      label: 'Mood Swings & Emotional Dysregulation',
      synonyms: ['emosi', 'meledak', 'mood swings', 'marah', 'irritable'],
      icfDomain: 'mental-emotional-health',
      keywords: [
        'mood',
        'irritable',
        'bipolar',
        'depression',
        'psychological',
        'stress',
        'psychiatrist'
      ],
      serviceTypeCode: 'mood-disorder-care',
      options: [
        { id: 'irritability', label: 'Quick to anger or irritability' },
        { id: 'rapid-mood-shifts', label: 'Intense mood shifts' },
        { id: 'anger-episodes', label: 'Difficulty controlling anger' },
        {
          id: 'mood-swings-other',
          label: 'Other mood-swing concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Do you feel a sudden urge to hurt someone or yourself?',
        resources: [SEHAT_JIWA, ER]
      }
    },
    {
      id: 'other-mental',
      label: 'Other Mental Health Concern',
      synonyms: ['mental', 'jiwa', 'other mental'],
      icfDomain: 'mental-emotional-health',
      keywords: ['mental', 'psychological', 'emotional'],
      serviceTypeCode: 'other-mental-emotional-health',
      options: [
        {
          id: 'other-mental',
          label: 'Another mental health concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this concern making it hard to get through the day?',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default mental;
