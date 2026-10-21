import type {
  ChiefComplaint,
  ChiefComplaintOption,
  DecisionDomain,
  DomainCode,
  RedFlag
} from '@/types/recommendation-interview';

/** Complaint node input without the derived labelKey and icfDomain fields. */
export interface ComplaintDefinition extends Omit<
  ChiefComplaint,
  'labelKey' | 'icfDomain' | 'options' | 'redFlag'
> {
  options: Omit<ChiefComplaintOption, 'labelKey'>[];
  redFlag: Omit<RedFlag, 'labelKey'>;
}

/** Domain input without the derived labelKey field. */
export interface DomainDefinition extends Omit<
  DecisionDomain,
  'labelKey' | 'complaints'
> {
  complaints: ComplaintDefinition[];
}

/**
 * Build a ChiefComplaint, deriving all labelKeys from the complaint id and
 * filling icfDomain from the owning domain code. Key order matches the
 * pre-refactor literal objects so serialized output stays byte-identical.
 *
 * @param domainCode - ICF domain code copied into icfDomain
 * @param complaint - Complaint definition without derived fields
 * @returns A full ChiefComplaint with deterministic labelKeys
 */
export const defineComplaint = (
  domainCode: DomainCode,
  complaint: ComplaintDefinition
): ChiefComplaint => ({
  id: complaint.id,
  label: complaint.label,
  labelKey: `complaint_${complaint.id}`,
  synonyms: complaint.synonyms,
  icfDomain: domainCode,
  keywords: complaint.keywords,
  serviceTypeCode: complaint.serviceTypeCode,
  options: complaint.options.map(option => ({
    id: option.id,
    label: option.label,
    labelKey: `option_${complaint.id}_${option.id}`,
    ...(option.isOther === undefined ? null : { isOther: option.isOther })
  })),
  redFlag: {
    isEmergency: complaint.redFlag.isEmergency,
    label: complaint.redFlag.label,
    labelKey: `redflag_${complaint.id}`,
    resources: complaint.redFlag.resources
  }
});

/**
 * Build a DecisionDomain, deriving the domain labelKey from the code and
 * running every complaint through defineComplaint.
 *
 * @param domain - Domain definition without derived fields
 * @returns A full DecisionDomain with deterministic labelKeys
 */
export const defineDomain = (domain: DomainDefinition): DecisionDomain => ({
  code: domain.code,
  label: domain.label,
  labelKey: `domain_${domain.code}`,
  complaints: domain.complaints.map(complaint =>
    defineComplaint(domain.code, complaint)
  )
});
