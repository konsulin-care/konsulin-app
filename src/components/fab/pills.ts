import {
  BookText,
  Calendar,
  ClipboardClock,
  FlaskConical,
  Form,
  HeartPulse,
  MapPin,
  Sparkles,
  UserPlus
} from 'lucide-react';
import type { Pill } from './types';

/**
 * Pill `label` values are page-header message keys; FabSpeedDial translates
 * them with t() at render time.
 */

/** Speed-dial pills for researcher role. */
export const researcherPills: Pill[] = [
  {
    label: 'pill_register_survey',
    icon: FlaskConical,
    delay: 0,
    action: 'register-research'
  },
  {
    label: 'pill_my_survey',
    href: '/research',
    icon: BookText,
    delay: 50,
    action: 'navigate'
  }
];

/** Speed-dial pills for patient role. */
export const patientPills: Pill[] = [
  {
    label: 'pill_self_checkup',
    href: '/assessments',
    icon: HeartPulse,
    delay: 0,
    action: 'navigate'
  },
  {
    label: 'pill_write_journal',
    href: '/journal',
    icon: BookText,
    delay: 50,
    action: 'navigate'
  },
  {
    label: 'pill_view_schedule',
    href: '/schedule',
    icon: Calendar,
    delay: 100,
    action: 'navigate'
  },
  {
    label: 'pill_join_research',
    href: '/research',
    icon: FlaskConical,
    delay: 150,
    action: 'navigate'
  },
  {
    label: 'pill_get_recommendation',
    icon: Sparkles,
    delay: 200,
    action: 'get-recommendation'
  }
];

/** Speed-dial pills for practitioner role. */
export const practitionerPills: Pill[] = [
  {
    label: 'pill_set_availability',
    href: '/practitioner',
    icon: ClipboardClock,
    delay: 0,
    action: 'navigate'
  },
  {
    label: 'pill_view_schedule',
    href: '/schedule',
    icon: Calendar,
    delay: 50,
    action: 'navigate'
  },
  {
    label: 'pill_health_screening',
    href: '/assessments',
    icon: HeartPulse,
    delay: 100,
    action: 'navigate'
  },
  {
    label: 'pill_soap',
    href: '/assessments/soap',
    icon: BookText,
    delay: 150,
    action: 'navigate'
  }
];

/** Speed-dial pills for clinic admin role. */
export const adminPills: Pill[] = [
  {
    label: 'pill_register_practitioner',
    icon: UserPlus,
    delay: 0,
    action: 'register-practitioner'
  },
  {
    label: 'pill_add_location',
    icon: MapPin,
    delay: 50,
    action: 'add-location'
  },
  {
    label: 'pill_add_assessments',
    icon: Form,
    delay: 100,
    action: 'add-assessment'
  }
];
