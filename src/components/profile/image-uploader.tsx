import Image from 'next/image';
import { useRef, useState } from 'react';

interface ImageUploaderProps {
  userPhoto: string;
  onPhotoChange: (photo: string) => void;
  initials: string;
  backgroundColor: string;
}

export default function ImageUploader({
  userPhoto,
  onPhotoChange,
  initials,
  backgroundColor
}: ImageUploaderProps) {
  const [isImageError, setIsImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onPhotoChange(reader.result as string);
        setIsImageError(false);
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className='mb-4 flex flex-col items-center px-4 pb-4'>
      <div className='pb-2'>
        {isImageError || !userPhoto ? (
          <div
            className='mr-2 flex h-[64px] w-[64px] items-center justify-center rounded-full text-xl font-bold text-white'
            style={{ backgroundColor }}
          >
            {initials}
          </div>
        ) : (
          <Image
            className='rounded-full'
            src={userPhoto}
            width={64}
            height={64}
            alt='user-photo'
            onError={() => setIsImageError(true)}
          />
        )}
      </div>
      <div className='flex items-center justify-center rounded-xl bg-[#F6F6F6]'>
        <div className='pb-2 pl-4 pr-2 pt-2'>
          <Image
            src={'/icons/edit-photo.svg'}
            width={16}
            height={16}
            alt='edit-photo'
          />
        </div>
        <span
          className='cursor-pointer pr-4 text-center text-[12px] font-semibold text-[#18AAA1] text-secondary'
          onClick={handleButtonClick}
        >
          Ganti Photo
        </span>
      </div>
      <input
        type='file'
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept='image/*'
      />
    </div>
  );
}
