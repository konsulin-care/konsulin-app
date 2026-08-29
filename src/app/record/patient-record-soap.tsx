/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { LoadingSpinnerIcon } from '@/components/icons';
import { useAuth } from '@/context/auth/authContext';
import { useGetSingleRecord } from '@/services/api/record';
import { getProfileById } from '@/services/profile';
import { useEffect } from 'react';

type Props = {
  soapId: string;
  onPractitionerNameChange?: (name: string) => void;
};

/** Build display name from a FHIR Practitioner name object. */
function formatPractitionerName(profile: {
  name?: Array<{
    prefix?: string[];
    given?: string[];
    family?: string;
  }>;
}): string {
  const name = profile.name?.[0];
  if (!name) return 'Practitioner';
  const prefix = name.prefix?.[0] ?? '';
  const given = (name.given ?? []).join(' ');
  const family = name.family ?? '';
  return [prefix, given, family].filter(Boolean).join(' ') || 'Practitioner';
}

/**
 * Patient-facing detail view for a Practitioner Note (LOINC 67855-7).
 *
 * Shows the practitioner's note content under a "Practitioner's Note" label.
 * Fetches the practitioner profile from Observation.performer to pass the
 * practitioner name up to the parent for the page header.
 */
export default function PatientRecordSoap({
  soapId,
  onPractitionerNameChange
}: Props) {
  const { isLoading: isAuthLoading } = useAuth();
  const { data: soapData, isLoading: isSoapLoading } = useGetSingleRecord({
    id: soapId,
    resourceType: 'Observation'
  });

  useEffect(() => {
    if (!soapData) return;

    const performerRef: string | undefined = soapData.performer?.[0]?.reference;
    if (!performerRef) {
      onPractitionerNameChange?.('Practitioner');
      return;
    }

    const practitionerId = performerRef.split('/')[1];
    if (!practitionerId) {
      onPractitionerNameChange?.('Practitioner');
      return;
    }

    /** Fetch the practitioner name from the performer reference. */
    const fetchProfile = async () => {
      try {
        const profile = await getProfileById(practitionerId, 'Practitioner');
        const name = formatPractitionerName(profile);
        onPractitionerNameChange?.(name);
      } catch {
        onPractitionerNameChange?.('Practitioner');
      }
    };
    fetchProfile().catch(() => {
      /* best-effort */
    });
  }, [soapData, onPractitionerNameChange]);

  return isAuthLoading || isSoapLoading ? (
    <div className='flex min-h-screen min-w-full items-center justify-center'>
      <LoadingSpinnerIcon
        width={56}
        height={56}
        className='w-full animate-spin'
      />
    </div>
  ) : (
    <div className='flex flex-col gap-5'>
      <div>
        <div className='text-muted mb-2 text-[12px]'>
          Practitioner&apos;s Note
        </div>
        <div className='card flex text-[14px]'>
          <div>{soapData.valueString}</div>
        </div>
      </div>
    </div>
  );
}
