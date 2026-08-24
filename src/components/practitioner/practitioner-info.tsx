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
  practitionerOrganizationName,
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
      {practitionerOrganizationName && (
        <div className='mt-2 text-[12px] font-normal'>
          {practitionerOrganizationName}
        </div>
      )}
      <div className='mt-1 text-center text-[18px] font-bold'>
        {practitionerName}
      </div>
    </div>
  );
}
