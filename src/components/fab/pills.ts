import {
  BookText,
  Calendar,
  ClipboardClock,
  HeartPulse,
  MapPin,
  Sparkles,
  UserPlus
} from 'lucide-react';
import type { Pill } from './types';

/** Speed-dial pills for patient role. */
export const patientPills: Pill[] = [
  {
    label: 'Self Checkup',
    href: '/assessments',
    icon: HeartPulse,
    delay: 0,
    action: 'navigate'
  },
  {
    label: 'Write Journal',
    href: '/journal',
    icon: BookText,
    delay: 50,
    action: 'navigate'
  },
  {
    label: 'View Schedule',
    href: '/schedule',
    icon: Calendar,
    delay: 100,
    action: 'navigate'
  },
  {
    label: 'Get Recommendation',
    href: '/recommendation',
    icon: Sparkles,
    delay: 150,
    action: 'navigate'
  }
];

/** Speed-dial pills for practitioner role. */
export const practitionerPills: Pill[] = [
  {
    label: 'Set Availability',
    href: '/practitioner',
    icon: ClipboardClock,
    delay: 0,
    action: 'navigate'
  },
  {
    label: 'View Schedule',
    href: '/schedule',
    icon: Calendar,
    delay: 50,
    action: 'navigate'
  },
  {
    label: 'Health Screening',
    href: '/assessments',
    icon: HeartPulse,
    delay: 100,
    action: 'navigate'
  },
  {
    label: 'S.O.A.P.',
    href: '/assessments/soap',
    icon: BookText,
    delay: 150,
    action: 'navigate'
  }
];

/** Speed-dial pills for clinic admin role. */
export const adminPills: Pill[] = [
  {
    label: 'Register Practitioner',
    icon: UserPlus,
    delay: 0,
    action: 'register-practitioner'
  },
  { label: 'Add Location', icon: MapPin, delay: 50, action: 'add-location' }
];
