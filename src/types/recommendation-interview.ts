import type { ASSESSMENT_CATEGORIES } from '@/constants/assessment-categories';

/** ICF domain codes shared with the /assessments category taxonomy. */
export type DomainCode = (typeof ASSESSMENT_CATEGORIES)[number]['code'];

/** A reachable emergency service (Indonesia hotline or helpline). */
export interface EmergencyResource {
  /** Short human name, e.g. "Sehat Jiwa (Kemenkes)". */
  name: string;
  /** Dialing number, e.g. "119". */
  phone: string;
  /** Optional extension after the main number, e.g. "8". */
  extension?: string;
  /** Optional WhatsApp click-to-chat link (full URL). */
  whatsapp?: string;
}

/** Non-blocking clinical-safety check attached to every complaint. */
export interface RedFlag {
  /** True when a positive answer warrants an emergency resource banner. */
  isEmergency: boolean;
  /** User-facing screening question, e.g. "Are you currently safe?". */
  label: string;
  /** Hotlines shown when the user answers positively (never blocks booking). */
  resources: EmergencyResource[];
}

/** One selectable answer inside a chief-complaint branch. */
export interface ChiefComplaintOption {
  id: string;
  label: string;
  /** Marks the catch-all "Other" option; must sit last when present. */
  isOther?: boolean;
}

/** One chief complaint node in the deterministic decision tree. */
export interface ChiefComplaint {
  id: string;
  label: string;
  /** Search tokens (English + Indonesian) matched by the complaint search. */
  synonyms: string[];
  /** ICF domain feature keywords aligned with the ontology interview map. */
  keywords: string[];
  icfDomain: DomainCode;
  /** Forward-contract HealthcareService code emitted for the new endpoint. */
  serviceTypeCode: string;
  /** Symptom-focus options; at most 7, last one "Other" when present. */
  options: ChiefComplaintOption[];
  redFlag: RedFlag;
}

/** One ICF domain bucket in the decision tree. */
export interface DecisionDomain {
  code: DomainCode;
  label: string;
  complaints: ChiefComplaint[];
}

/** Deterministic output of a completed smart interview. */
export interface InterviewResult {
  complaintId: string;
  complaintLabel: string;
  /** Canonical NUCC code used to fetch recommendations today. */
  specialty: string;
  /** Forward-contract HealthcareService code for the new BFF endpoint. */
  serviceTypeCode: string;
  icfDomain: DomainCode;
  redFlag: RedFlag;
}
