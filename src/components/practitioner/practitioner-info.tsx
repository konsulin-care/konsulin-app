import Avatar from '@/components/general/avatar';
import { getInitials } from '@/utils/name';

interface PractitionerInfoProps {
  practitionerAvatar?: {
    photoUrl?: string;
    initials?: string;
    backgroundColor?: string;
    seed?: string;
  };
  practitionerOrganizationName?: string;
  practitionerName?: string;
}

/**
 * Practitioner avatar, organization, and name display component.
 * Used in payment drawers and booking flows.
 *
 * Falls back to a gradient monogram (seed + derived initials) when no photo
 * is available, and renders nothing when no name exists yet.
 */
export function PractitionerInfo({
  practitionerAvatar,
  practitionerOrganizationName: _practitionerOrganizationName, // eslint-disable-line @typescript-eslint/no-unused-vars -- kept for backward compat
  practitionerName
}: Readonly<PractitionerInfoProps>) {
  if (!practitionerName) return null;

  const initials =
    practitionerAvatar?.initials || getInitials(practitionerName);

  return (
    <div className='flex flex-col items-center'>
      <Avatar
        photoUrl={practitionerAvatar?.photoUrl}
        initials={initials}
        backgroundColor={practitionerAvatar?.backgroundColor || '#999'}
        height={72}
        width={72}
        seed={practitionerName}
      />
      <div className='mt-1 text-center text-[18px] font-bold'>
        {practitionerName}
      </div>
    </div>
  );
}
