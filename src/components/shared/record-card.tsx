/* eslint-disable complexity */
'use client';

import Avatar from '@/components/general/avatar';
import NoteIcon from '@/components/icons/note-icon';
import { Badge } from '@/components/ui/badge';
import { typeMappings } from '@/constants/record';
import { IRecord } from '@/types/record';
import {
  customMarkdownComponents,
  formatTitle,
  generateAvatarPlaceholder
} from '@/utils/helper';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

type Props = {
  readonly record: IRecord;
  readonly getPractitionerInfo: (r: IRecord) => {
    displayName: string;
    email: string;
  };
  readonly showAvatarFor?: string[];
  readonly formatTitleFor?: string[];
  readonly getDescription?: (record: IRecord) => string;
};

/**
 *
 */
export default function RecordCard({
  record,
  getPractitionerInfo,
  showAvatarFor = [],
  formatTitleFor = [],
  getDescription
}: Props) {
  const splitTitle = record.title.split('/');
  const title = splitTitle[1] ? splitTitle[1] : splitTitle[0];
  const formattedTitle =
    formatTitleFor.length === 0 || formatTitleFor.includes(record.type)
      ? formatTitle(title)
      : title;

  const recordId = record.id.split('/')[1];

  const formattedDate = format(new Date(record.lastUpdated), 'dd/MM/yyyy');

  const cleanDescription = getDescription
    ? getDescription(record)
    : ((record.result as string) || '\\-').replace(/\n\n/g, '. ');

  const queryParams = new URLSearchParams({
    category: String(typeMappings[record.type]?.category ?? ''),
    title
  }).toString();
  const url = `/record?recordId=${recordId}&${queryParams}`;

  const { displayName, email } = getPractitionerInfo(record);
  const { initials, backgroundColor, seed } = generateAvatarPlaceholder({
    id: record.practitionerId,
    name: displayName,
    email
  });
  const photoUrl = record.practitionerProfile?.photo?.[0]?.url;

  const showAvatar = showAvatarFor.includes(record.type);

  return (
    <Link
      key={recordId}
      href={url}
      className='card mt-4 flex flex-col gap-2 p-4'
    >
      <div className='flex'>
        <div className='mr-2 h-[40px] w-[40px] shrink-0 rounded-full bg-[#F8F8F8] p-2'>
          <Image
            className='h-[24px] w-[24px] object-cover'
            src={'/images/note.svg'}
            width={24}
            height={24}
            alt='note'
          />
        </div>
        <div className='flex w-0 grow flex-col justify-center'>
          <div className='text-[12px] font-bold'>{formattedTitle}</div>
          <div className='line-clamp-3 overflow-hidden text-[10px] text-ellipsis'>
            <ReactMarkdown components={customMarkdownComponents}>
              {cleanDescription}
            </ReactMarkdown>
          </div>
        </div>
      </div>
      <hr className='w-full' />
      <div className='flex items-center'>
        {showAvatar ? (
          <>
            <Avatar
              seed={seed}
              initials={initials}
              backgroundColor={backgroundColor}
              photoUrl={photoUrl}
              height={32}
              width={32}
              className='mr-2 text-xs'
              imageClassName='mr-2 self-center'
            />
            <div className='mr-auto text-[12px]'>{displayName}</div>
          </>
        ) : (
          <div className='mr-auto text-[12px]'>
            <Badge className='flex items-center rounded-full bg-[#08979C] px-[10px] py-[4px]'>
              <NoteIcon fill='white' width={16} height={16} />
              <div className='ml-1 text-[10px] text-white'>
                {typeMappings[record.type]?.text ?? record.type}
              </div>
            </Badge>
          </div>
        )}

        <div className='text-[10px]'>{formattedDate}</div>
      </div>
    </Link>
  );
}
