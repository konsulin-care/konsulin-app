import type { EmergencyResource } from '@/types/recommendation-interview';

/** Indonesia national emergency line (ambulance) — tap-to-call. */
export const ER: EmergencyResource = {
  name: 'Emergency Nasional',
  phone: '112'
};

/** Kemenkes mental-health crisis line: dial 119, then extension 8. */
export const SEHAT_JIWA: EmergencyResource = {
  name: 'Sehat Jiwa (Kemenkes)',
  phone: '119',
  extension: '8'
};

/** Kemen PPPA women & child protection helpline. */
export const SAPA129: EmergencyResource = {
  name: 'SAPA 129 (Kemen PPPA)',
  phone: '129'
};
