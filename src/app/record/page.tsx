'use client';

import Avatar from '@/components/general/avatar';
import BackButton from '@/components/general/back-button';
import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import NoteIcon from '@/components/icons/note-icon';
import NavigationBar from '@/components/navigation-bar';
import { Badge } from '@/components/ui/badge';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { typeMappings } from '@/constants/record';
import { useAuth } from '@/context/auth/authContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilterRecordByDate, useRecordSummary } from '@/services/api/record';
import { getProfileById } from '@/services/profile';
import { IRecord } from '@/types/record';
import {
  customMarkdownComponents,
  formatTitle,
  generateAvatarPlaceholder,
  mergeNames,
  parseRecordBundles
} from '@/utils/helper';
import { format, parseISO } from 'date-fns';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import RecordFilter, { IRecordParams } from './record-filter';

// NOTE: differentiate record summary for Patient and Practitioner
// TODO: add soap report record for both patient and practitioner
export default function Record() {
  const [recordFilter, setRecordFilter] = useState<IRecordParams>({
    query: ''
  });
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const { mutate: getRecords, isLoading: isRecordLoading } = useRecordSummary();
  const { mutate: getFilteredRecord, isLoading: isFilteredRecordLoading } =
    useFilterRecordByDate();
  const [records, setRecords] = useState<IRecord[] | null>(null);

  const debouncedQuery = useDebounce(recordFilter.query, 500);

  const filteredRecords = useMemo(() => {
    if (!records) return [];

    return records
      .filter(record => {
        const { start_date, end_date, type } = recordFilter;

        const recordDate = format(parseISO(record.lastUpdated), 'yyyy-MM-dd');
        const startDate = start_date ? format(start_date, 'yyyy-MM-dd') : null;
        const endDate = end_date ? format(end_date, 'yyyy-MM-dd') : null;

        const matchesDateRange =
          (!startDate || recordDate >= startDate) &&
          (!endDate || recordDate <= endDate);

        const matchesType = !type || type === 'All' || record.type === type;

        const queryLower = debouncedQuery?.toLowerCase() || '';
        const matchesQuery =
          !debouncedQuery || record.result?.toLowerCase().includes(queryLower);

        return matchesDateRange && matchesType && matchesQuery;
      })
      .sort((a, b) => {
        // sort by lastUpdated in descending order (latest first)
        return (
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
      });
  }, [records, recordFilter, debouncedQuery]);

  /*
   * fetch patient records. if a record is a 'Practitioner Note',
   * also fetch the practitioner's profile to include in the result.
   */
  useEffect(() => {
    if (authState.userInfo.role_name !== 'patient') return;

    if (recordFilter.isUseCustomDate) {
      getFilteredRecord(
        {
          patientId: authState.userInfo.fhirId,
          startDate: format(recordFilter.start_date, 'yyyy-MM-dd'),
          endDate: format(recordFilter.end_date, 'yyyy-MM-dd')
        },
        {
          onSuccess: async result => {
            const parsed = parseRecordBundles(result);

            const attachProfile = await Promise.all(
              parsed.map(async item => {
                if (item.type !== 'Practitioner Note') return item;

                const practitionerProfile = await getProfileById(
                  item.practitionerId,
                  'Practitioner'
                );
                return { ...item, practitionerProfile };
              })
            );

            setRecords(attachProfile);
          }
        }
      );
    } else {
      getRecords(authState.userInfo.fhirId, {
        onSuccess: async result => {
          const parsed = parseRecordBundles(result);

          const attachProfile = await Promise.all(
            parsed.map(async item => {
              if (item.type !== 'Practitioner Note') return item;

              const practitionerProfile = await getProfileById(
                item.practitionerId,
                'Practitioner'
              );
              return { ...item, practitionerProfile };
            })
          );

          setRecords(attachProfile);
        }
      });
    }
  }, [authState, recordFilter.isUseCustomDate]);

  const getPractitionerInfo = (record: IRecord) => {
    if (record.type !== 'Practitioner Note')
      return { displayName: '', email: '' };

    const name = mergeNames(
      record.practitionerProfile?.name,
      record.practitionerProfile?.qualification
    );

    const email =
      record.practitionerProfile?.telecom.find(item => item.system === 'email')
        ?.value || '';

    return { displayName: name, email };
  };

  const handleSetRecordFilter = (key: string, value: string) => {
    setRecordFilter(prevState => ({
      ...prevState,
      [key]: value
    }));
  };

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
        {/* Filter & Search based on result prop */}
        <div className='flex flex-col px-4 pb-4'>
          <div className='flex gap-4'>
            <InputWithIcon
              value={recordFilter.query}
              onChange={event =>
                handleSetRecordFilter('query', event.target.value)
              }
              placeholder='Search Entry & Record'
              className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            />
            <RecordFilter
              onChange={(filter: IRecordParams) => {
                setRecordFilter((prevState: IRecordParams) => ({
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
                {typeMappings[recordFilter.type].text}
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

          {isAuthLoading ||
          isRecordLoading ||
          isFilteredRecordLoading ||
          !filteredRecords ? (
            <div className='flex flex-col gap-2'>
              <Skeleton
                count={4}
                className='mt-4 h-[100px] w-full bg-[hsl(210,40%,96.1%)]'
              />
            </div>
          ) : filteredRecords.length > 0 ? (
            filteredRecords.map((record: IRecord) => {
              const splitTitle = record.title.split('/');
              const title = splitTitle[1] ? splitTitle[1] : splitTitle[0];
              const formattedTitle =
                record.type === 'QuestionnaireResponse'
                  ? formatTitle(title)
                  : title;
              const recordId = record.id.split('/')[1];
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
                title
              }).toString();
              const url = `record/${recordId}?${queryParams}`;

              const { displayName, email } = getPractitionerInfo(record);
              const { initials, backgroundColor } = generateAvatarPlaceholder({
                id: record.practitionerId,
                name: displayName,
                email: email
              });
              const photoUrl = record.practitionerProfile?.photo?.[0]?.url;

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
                    <div className='flex w-0 grow flex-col'>
                      <div className='text-[12px] font-bold'>
                        {formattedTitle}
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
                    {record.type === 'Practitioner Note' ? (
                      <>
                        <Avatar
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
            })
          ) : (
            <EmptyState className='py-16' title='No Records Found' />
          )}
        </div>
      </ContentWraper>
    </>
  );
}
