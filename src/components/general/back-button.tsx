'use client';

import { ChevronLeftIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Props = {
  size?: number;
  route?: string;
};

const BackButton = ({ size = 32, route }: Props) => {
  const router = useRouter();

  const handleBackClick = () => {
    if (route) {
      router.push(route);
    } else {
      router.back();
    }
  };

  return (
    <ChevronLeftIcon
      size={size}
      onClick={handleBackClick}
      color='white'
      className='mr-2 cursor-pointer'
    />
  );
};

export default BackButton;
