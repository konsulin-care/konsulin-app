import type { DecisionDomain } from '@/types/recommendation-interview';
import { ER, SEHAT_JIWA } from '../resources';

/** Physical Health domain branches. */
const physical: DecisionDomain = {
  code: 'physical-health',
  label: 'Physical Health',
  complaints: [
    {
      id: 'pain-musculoskeletal',
      label: 'Musculoskeletal & Joint Pain',
      synonyms: ['nyeri', 'sakit', 'back pain', 'joint', 'otot', 'sendi'],
      icfDomain: 'physical-health',
      keywords: [
        'musculoskeletal',
        'joint',
        'spine',
        'bone',
        'pain',
        'orthopaedic',
        'knee',
        'shoulder',
        'muscle'
      ],
      serviceTypeCode: 'pain-management',
      options: [
        { id: 'low-back-pain', label: 'Low back pain' },
        { id: 'joint-stiffness', label: 'Stiff or aching joints' },
        { id: 'neck-shoulder-tension', label: 'Neck or shoulder tension' },
        { id: 'body-aches', label: 'Widespread body aches' },
        { id: 'post-exercise-soreness', label: 'Pain after exercise' },
        { id: 'pain-other', label: 'Other pain concern', isOther: true }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Are you having chest pain or acute difficulty breathing?',
        resources: [ER]
      }
    },
    {
      id: 'headache-migraine',
      label: 'Headache & Migraine',
      synonyms: ['sakit kepala', 'migrain', 'headache', 'migraine', 'pusing'],
      icfDomain: 'physical-health',
      keywords: [
        'headache',
        'migraine',
        'pain',
        'neurological',
        'throbbing',
        'dizziness'
      ],
      serviceTypeCode: 'headache-care',
      options: [
        { id: 'tension-headache', label: 'Throbbing tension headache' },
        { id: 'migraine', label: 'Migraine with or without aura' },
        { id: 'chronic-daily-headache', label: 'Headache most days' },
        { id: 'sinus-headache', label: 'Pressure behind eyes or forehead' },
        { id: 'cluster-headache', label: 'Severe one-sided headache' },
        { id: 'headache-other', label: 'Other headache concern', isOther: true }
      ],
      redFlag: {
        isEmergency: true,
        label:
          'Did the headache start suddenly and severely, or did you lose consciousness?',
        resources: [ER]
      }
    },
    {
      id: 'respiratory-airway',
      label: 'Cough & Breathing Issues',
      synonyms: ['batuk', 'sesak', 'cough', 'breath', 'napas', 'tenggorokan'],
      icfDomain: 'physical-health',
      keywords: [
        'respiratory',
        'breath',
        'breathing',
        'cough',
        'lung',
        'airway',
        'chest',
        'illness'
      ],
      serviceTypeCode: 'respiratory-care',
      options: [
        { id: 'persistent-cough', label: 'Cough lasting more than a week' },
        { id: 'shortness-of-breath', label: 'Shortness of breath' },
        { id: 'sore-throat', label: 'Sore throat or pharyngitis' },
        { id: 'nasal-congestion', label: 'Blocked or runny nose' },
        {
          id: 'respiratory-other',
          label: 'Other breathing concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Are you struggling to breathe or turning blue?',
        resources: [ER]
      }
    },
    {
      id: 'gastrointestinal',
      label: 'Stomach & Digestion Issues',
      synonyms: [
        'perut',
        'mual',
        'muntah',
        'stomach',
        'digest',
        'maag',
        'diare'
      ],
      icfDomain: 'physical-health',
      keywords: [
        'gastrointestinal',
        'stomach',
        'digestive',
        'bowel',
        'nausea',
        'diarrhea'
      ],
      serviceTypeCode: 'digestive-care',
      options: [
        { id: 'nausea-vomiting', label: 'Nausea or vomiting' },
        { id: 'diarrhea', label: 'Diarrhea or food poisoning' },
        { id: 'acid-reflux', label: 'Acid reflux or heartburn' },
        { id: 'bowel-changes', label: 'Sudden change in bowel habits' },
        { id: 'stomach-pain', label: 'Persistent stomach pain' },
        {
          id: 'digestive-other',
          label: 'Other digestion concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Do you have severe abdominal pain or blood in your stool?',
        resources: [ER]
      }
    },
    {
      id: 'sleep-fatigue',
      label: 'Sleep & Fatigue Problems',
      synonyms: ['tidur', 'insomnia', 'lelah', 'sleep', 'fatigue', 'lemas'],
      icfDomain: 'physical-health',
      keywords: ['sleep', 'insomnia', 'fatigue', 'exhaustion', 'tiredness'],
      serviceTypeCode: 'sleep-care',
      options: [
        { id: 'insomnia', label: 'Difficulty falling or staying asleep' },
        { id: 'poor-sleep-quality', label: 'Waking up unrefreshed' },
        { id: 'daytime-fatigue', label: 'Fatigue during the day' },
        { id: 'chronic-exhaustion', label: 'Constant exhaustion' },
        { id: 'sleep-other', label: 'Other sleep concern', isOther: true }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Are you too exhausted to care for your basic needs?',
        resources: [SEHAT_JIWA]
      }
    },
    {
      id: 'fever-malaise',
      label: 'Fever & General Malaise',
      synonyms: ['demam', 'lemah', 'pusing', 'fever', 'weakness', 'dizziness'],
      icfDomain: 'physical-health',
      keywords: [
        'fever',
        'weakness',
        'dizziness',
        'illness',
        'acute',
        'general'
      ],
      serviceTypeCode: 'systemic-care',
      options: [
        { id: 'acute-fever', label: 'High or persistent fever' },
        { id: 'generalized-weakness', label: 'General weakness or malaise' },
        { id: 'dizziness-vertigo', label: 'Dizziness or vertigo' },
        { id: 'skin-rash', label: 'Skin rash or swelling' },
        { id: 'fever-other', label: 'Other general symptom', isOther: true }
      ],
      redFlag: {
        isEmergency: true,
        label: 'Do you have a high fever with confusion or a stiff neck?',
        resources: [ER]
      }
    },
    {
      id: 'other-physical',
      label: 'Other Physical Concern',
      synonyms: ['physical', 'fisik', 'lain', 'other'],
      icfDomain: 'physical-health',
      keywords: ['physical', 'general', 'illness'],
      serviceTypeCode: 'other-physical-health',
      options: [
        {
          id: 'other-physical',
          label: 'Another physical concern',
          isOther: true
        }
      ],
      redFlag: {
        isEmergency: false,
        label: 'Is this concern making you unable to function today?',
        resources: [SEHAT_JIWA]
      }
    }
  ]
};

export default physical;
