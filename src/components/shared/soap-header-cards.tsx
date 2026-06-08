'use client';

import { formatTitle } from '@/utils/helper';
import { NotepadTextIcon, UsersIcon } from 'lucide-react';

type Props = {
  readonly displayName: string;
  readonly title: string;
};

/**
 *
 */
export default function SoapHeaderCards({ displayName, title }: Props) {
  return (
    <div className='space-y-4'>
      <div className='card flex border'>
        <UsersIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
        <div>{displayName}</div>
      </div>

      <div className='card flex border'>
        <NotepadTextIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
        <div>{formatTitle(title)}</div>
      </div>
    </div>
  );
}
