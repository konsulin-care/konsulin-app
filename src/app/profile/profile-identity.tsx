'use client';

import PhotoUploader from '@/components/profile/photo-uploader';
import { Pencil } from 'lucide-react';
import type { ProfileIdentity as Identity } from './hooks/useProfileData';

type Props = {
  /** The active role name shown on the badge. */
  roleName: string;
  /** Identity block (photo, initials, collapsed name) from useProfileData. */
  identity: Identity;
  /** True while a photo upload is in flight. */
  isUploading: boolean;
  /** Called with a picked photo file for immediate upload. */
  onFileSelected: (file: File) => void;
  /** Opens the name edit drawer. */
  onEditName: () => void;
};

/**
 * Identity hero of the profile page: centered circular photo with the active
 * role badge pinned to its bottom edge, and the collapsed name below with a
 * pencil opening the name editor. Shared by every role.
 */
export default function ProfileIdentity({
  roleName,
  identity,
  isUploading,
  onFileSelected,
  onEditName
}: Readonly<Props>) {
  return (
    <div className='flex flex-col items-center px-4 py-6'>
      <div className='relative inline-block'>
        <PhotoUploader
          photoUrl={identity.photoUrl}
          initials={identity.initials}
          backgroundColor={identity.backgroundColor}
          isUploading={isUploading}
          onFileSelected={onFileSelected}
        />
        <span
          data-testid='role-badge'
          className='bg-secondary absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-white'
        >
          {roleName}
        </span>
      </div>
      <div className='mt-5 flex items-center justify-center gap-1.5'>
        <p
          data-testid='display-name'
          className='max-w-[220px] truncate text-base font-bold text-[#2C2F35]'
        >
          {identity.displayName || '-'}
        </p>
        <button
          type='button'
          data-testid='edit-name'
          onClick={onEditName}
          aria-label='Edit name'
          className='text-secondary cursor-pointer'
        >
          <Pencil className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
}
