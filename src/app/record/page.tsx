'use client';

import BackButton from '@/components/general/back-button';
import ContentWraper from '@/components/general/content-wraper';
import Header from '@/components/header';
import NoteIcon from '@/components/icons/note-icon';
import NavigationBar from '@/components/navigation-bar';
import { Badge } from '@/components/ui/badge';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { typeMappings } from '@/constants/record';
import { useAuth } from '@/context/auth/authContext';
import { useRecordSummary } from '@/services/api/record';
import { IRecord } from '@/types/record';
import { customMarkdownComponents, parseRecordBundles } from '@/utils/helper';
import { format } from 'date-fns';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ClinicFilter from './record-filter';

export default function Record() {
  const router = useRouter();
  const [recordFilter, setRecordFilter] = useState<any>({
    name: ''
  });
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const { mutate: getRecords, isLoading: isRecordLoading } = useRecordSummary();
  const [records, setRecords] = useState<IRecord[] | null>(null);

  useEffect(() => {
    // NOTE: hardcoded Patient-id
    if (authState.userInfo.role_name === 'patient') {
      getRecords('Patient-id', {
        onSuccess: result => {
          const parsed = parseRecordBundles(result);
          setRecords(parsed);
        }
      });
    }
  }, [authState]);

  function handleSetRecordFilter(key: string, value: string) {
    setRecordFilter(prevState => ({
      ...prevState,
      [key]: value
    }));
  }
  return (
    <>
      <NavigationBar />
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <BackButton route='/' />
          <div className='text-[14px] font-bold text-white'>Summary Record</div>
        </div>
      </Header>

      <ContentWraper className='pt-4'>
        {/* Filter & Search */}
        <div className='flex flex-col px-4 pb-4'>
          <div className='flex gap-4'>
            <InputWithIcon
              value={recordFilter.name}
              onChange={event =>
                handleSetRecordFilter('name', event.target.value)
              }
              placeholder='Search Entry & Record'
              className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            />
            <ClinicFilter
              onChange={filter => {
                setRecordFilter(prevState => ({
                  ...prevState,
                  ...filter
                }));
              }}
            />
          </div>

          <div className='flex gap-4'>
            {recordFilter.start_date && recordFilter.end_date && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {recordFilter.start_date == recordFilter.end_date
                  ? format(recordFilter.start_date, 'dd MMM yy')
                  : format(recordFilter.start_date, 'dd MMM yy') +
                    ' - ' +
                    format(recordFilter.end_date, 'dd MMM yy')}
              </Badge>
            )}
            {recordFilter.type && recordFilter.type !== 'All' && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {recordFilter.type}
              </Badge>
            )}
          </div>
        </div>

        <div className='bg-[#F9F9F9] p-4'>
          <Link
            href={'/journal'}
            className='card flex w-full bg-white px-4 py-6'
          >
            <Image
              src={'/images/writing.svg'}
              width={40}
              height={40}
              alt='writing'
            />
            <div className='ml-2 flex flex-col'>
              <span className='text-[12px] font-bold text-primary'>
                Start Writting
              </span>
              <span className='text-[10px] text-primary'>
                Express your current feelings
              </span>
            </div>
          </Link>
        </div>

        <div className='p-4'>
          <div className='text-[14px] font-bold text-[hsla(220,9%,19%,0.6)]'>
            Previous Record Summary
          </div>

          {!records ||
          records.length === 0 ||
          isAuthLoading ||
          isRecordLoading ? (
            <div className='flex flex-col gap-4'>
              <Skeleton
                count={4}
                className='mt-4 h-[100px] w-full bg-[hsl(210,40%,96.1%)]'
              />
            </div>
          ) : (
            records.map((record: IRecord) => {
              const formattedDate = format(
                new Date(record.lastUpdated),
                'dd/MM/yyyy'
              );
              const cleanDescription = (record.result || '-').replace(
                /\n\n/g,
                '. '
              );
              const queryParams = new URLSearchParams({
                category: typeMappings[record.type]?.category,
                title: record.title
              }).toString();
              const url = `record/${record.id}?${queryParams}`;

              return (
                <Link
                  key={record.id}
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
                    <div className='flex w-0 grow flex-col'>
                      <div className='text-[12px] font-bold'>
                        {record.title}
                      </div>
                      <div className='line-clamp-3 overflow-hidden text-ellipsis text-[10px]'>
                        <ReactMarkdown components={customMarkdownComponents}>
                          {cleanDescription}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                  <hr className='w-full' />
                  <div className='flex items-center'>
                    <div className='mr-auto text-[12px]'>
                      <Badge className='flex items-center rounded-full bg-[#08979C] px-[10px] py-[4px]'>
                        <NoteIcon fill='white' width={16} height={16} />
                        <div className='ml-1 text-[10px] text-white'>
                          {typeMappings[record.type].text ?? record.type}
                        </div>
                      </Badge>
                    </div>
                    <div className='text-[10px]'>{formattedDate}</div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </ContentWraper>
    </>
  );
}
