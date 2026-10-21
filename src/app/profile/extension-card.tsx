'use client';

import InformationDetail, {
  type DetailRow
} from '@/components/profile/information-detail';
import { useTranslations } from '@/i18n';
import type { Patient, Person, Practitioner } from 'fhir/r4';

type Props = {
  /** The loaded FHIR profile; role-specific rows derive from it. */
  profile?: Patient | Practitioner | Person;
};

/** Build qualification rows (specialty, license, issuer) for a Practitioner. */
function buildQualificationRows(
  profile: Practitioner,
  t: (key: string) => string
): DetailRow[] {
  if (!profile.qualification?.length) return [];
  return profile.qualification.flatMap((qualification, index) => {
    const rows: DetailRow[] = [];
    const code =
      qualification.code?.coding?.[0]?.display ?? qualification.code?.text;
    if (code) {
      rows.push({
        id: `qual-code-${index}`,
        key: t('specialty'),
        value: code
      });
    }
    const licenseNumber = qualification.identifier?.[0]?.value;
    if (licenseNumber) {
      rows.push({
        id: `qual-license-${index}`,
        key: t('license_number'),
        value: licenseNumber
      });
    }
    const issuer = qualification.issuer?.display;
    if (issuer) {
      rows.push({
        id: `qual-issuer-${index}`,
        key: t('issuer'),
        value: issuer
      });
    }
    return rows;
  });
}

/** Build the marital-status row for a Patient when present. */
function buildMaritalRows(
  profile: Patient,
  t: (key: string) => string
): DetailRow[] {
  const status = profile.maritalStatus;
  if (!status) return [];
  const value =
    status.text ??
    status.coding?.[0]?.display ??
    status.coding?.[0]?.code ??
    '-';
  return [{ id: 'marital', key: t('marital_status'), value }];
}

/**
 * Role extension card (display-only): Practitioner qualifications and
 * Patient marital status. Renders nothing when the role has no extra data.
 */
export default function ExtensionCard({ profile }: Readonly<Props>) {
  const t = useTranslations('profile');
  if (!profile) return null;

  let title = '';
  let rows: DetailRow[] = [];
  if (profile.resourceType === 'Practitioner') {
    title = t('professional');
    rows = buildQualificationRows(profile, t);
  } else if (profile.resourceType === 'Patient') {
    title = t('additional');
    rows = buildMaritalRows(profile, t);
  }

  if (rows.length === 0) return null;
  return <InformationDetail title={title} rows={rows} />;
}
