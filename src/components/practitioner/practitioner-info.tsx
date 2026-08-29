import Avatar from '@/components/general/avatar';

interface PractitionerInfoProps {
  practitionerAvatar?: {
    photoUrl?: string;
    initials?: string;
    backgroundColor?: string;
  };
  practitionerOrganizationName?: string;
  practitionerName?: string;
}

/**
 * Practitioner avatar, organization, and name display component.
 * Used in payment drawers and booking flows.
 */
export function PractitionerInfo({
  practitionerAvatar,
  practitionerOrganizationName: _practitionerOrganizationName, // eslint-disable-line @typescript-eslint/no-unused-vars -- kept for backward compat
  practitionerName
}: Readonly<PractitionerInfoProps>) {
  return (
    <div className='flex flex-col items-center'>
      <Avatar
        photoUrl={practitionerAvatar?.photoUrl}
        initials={practitionerAvatar?.initials || ''}
        backgroundColor={practitionerAvatar?.backgroundColor || '#999'}
        height={72}
        width={72}
      />
      <div className='mt-1 text-center text-[18px] font-bold'>
        {practitionerName}
      </div>
    </div>
  );
}
