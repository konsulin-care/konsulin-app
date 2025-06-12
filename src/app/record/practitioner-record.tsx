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
import {
  useFilterRecordPractitionerByDate,
  useRecordSummaryPractitioner
} from '@/services/api/record';
import { getProfileById } from '@/services/profile';
import { IRecord } from '@/types/record';
import {
  customMarkdownComponents,
  formatTitle,
  generateAvatarPlaceholder,
  getTypeLabel,
  mergeNames,
  parseRecordBundlePractitioner
} from '@/utils/helper';
import { format, parseISO } from 'date-fns';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import RecordFilter, { IRecordParams } from './record-filter';

export default function PractitionerRecord() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId');
  const [recordFilter, setRecordFilter] = useState<IRecordParams>({
    query: ''
  });
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const { mutate: getRecords, isLoading: isRecordLoading } =
    useRecordSummaryPractitioner();
  const { mutate: getFilteredRecord, isLoading: isFilteredRecordLoading } =
    useFilterRecordPractitionerByDate();
  const [records, setRecords] = useState<IRecord[] | null>(null);
  const [filteredRecords, setFilteredRecords] = useState<IRecord[] | null>(
    null
  );
  const [isFiltering, setIsFiltering] = useState<boolean>(true);

  const debouncedQuery = useDebounce(recordFilter.query, 500);

  const filterTypeLabel = getTypeLabel(recordFilter.type);

  /**
   * filters and sorts patient previous records based on:
   * - date range (start_date to end_date)
   * - record type (SOAP Notes, Patient Note, etc)
   * - search query (matched against:
   *     - the value of "Catatan Edukasi Pasien" if result is an array
   *     - the whole result string if result is a string)
   *
   * results are sorted by `lastUpdated` (latest first).
   */
  useEffect(() => {
    if (!records || records.length === 0) {
      setFilteredRecords([]);
      return;
    }

    setIsFiltering(true);

    const result = records
      .filter(record => {
        const { start_date, end_date, type } = recordFilter;

        const recordDate = format(parseISO(record.lastUpdated), 'yyyy-MM-dd');
        const startDate = start_date ? format(start_date, 'yyyy-MM-dd') : null;
        const endDate = end_date ? format(end_date, 'yyyy-MM-dd') : null;

        const matchesDateRange =
          (!startDate || recordDate >= startDate) &&
          (!endDate || recordDate <= endDate);

        const typeList = type?.split(',').map(t => t.trim());
        const matchesType =
          !type || type === 'All' || typeList.includes(record.type);

        const queryLower = debouncedQuery?.toLowerCase() || '';
        let matchesQuery = true;
        if (debouncedQuery) {
          if (Array.isArray(record.result)) {
            matchesQuery = record.result.some(
              section =>
                section.label === 'Catatan Edukasi Pasien' &&
                section.value?.toLowerCase().includes(queryLower)
            );
          } else if (typeof record.result === 'string') {
            matchesQuery = record.result.toLowerCase().includes(queryLower);
          } else {
            matchesQuery = false;
          }
        }

        return matchesDateRange && matchesType && matchesQuery;
      })
      .sort((a, b) => {
        return (
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
      });

    setFilteredRecords(result);
    setIsFiltering(false);
  }, [records, recordFilter, debouncedQuery]);

  /*
   * fetch patient records. if a record is a 'SOAP Notes',
   * also fetch the practitioner's profile to include in the result.
   */
  useEffect(() => {
    if (!patientId) {
      setIsFiltering(false);
      return;
    }

    if (recordFilter.isUseCustomDate) {
      getFilteredRecord(
        {
          patientId,
          startDate: format(recordFilter.start_date, 'yyyy-MM-dd'),
          endDate: format(recordFilter.end_date, 'yyyy-MM-dd')
        },
        {
          onSuccess: async result => {
            const parsed = parseRecordBundlePractitioner(result);

            const attachProfile = await Promise.all(
              parsed.map(async item => {
                if (
                  item.type !== 'SOAP Notes' &&
                  item.type !== 'Practitioner Note'
                )
                  return item;

                const practitionerProfile = await getProfileById(
                  item.practitionerId,
                  'Practitioner'
                );
                return { ...item, practitionerProfile };
              })
            );

            setRecords(attachProfile);
          },
          onError: error => {
            toast.error(error.message);
            setIsFiltering(false);
          }
        }
      );
    } else {
      getRecords(
        { patientId },
        {
          onSuccess: async result => {
            const parsed = parseRecordBundlePractitioner(result);

            const attachProfile = await Promise.all(
              parsed.map(async item => {
                if (
                  item.type !== 'SOAP Notes' &&
                  item.type !== 'Practitioner Note'
                )
                  return item;

                const practitionerProfile = await getProfileById(
                  item.practitionerId,
                  'Practitioner'
                );
                return { ...item, practitionerProfile };
              })
            );

            setRecords(attachProfile);
          },
          onError: error => {
            toast.error(error.message);
            setIsFiltering(false);
          }
        }
      );
    }
  }, [authState, recordFilter.isUseCustomDate, patientId]);

  const getPractitionerInfo = (record: IRecord) => {
    if (record.type !== 'SOAP Notes' && record.type !== 'Practitioner Note')
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
            {filterTypeLabel && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {filterTypeLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className='bg-[#F9F9F9] p-4'>
          <Link
            href={'/assessments/soap'}
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
                SOAP Report
              </span>
              <span className='text-[10px] text-primary'>Start Writting</span>
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
          isFiltering ? (
            <div className='flex flex-col gap-2'>
              <Skeleton
                count={4}
                className='mt-4 h-[100px] w-full bg-[hsl(210,40%,96.1%)]'
              />
            </div>
          ) : filteredRecords && filteredRecords.length > 0 ? (
            filteredRecords.map((record: IRecord) => {
              const splitTitle = record.title.split('/');
              const title = splitTitle[1] ? splitTitle[1] : splitTitle[0];
              const formattedTitle =
                record.type === 'QuestionnaireResponse' ||
                record.type === 'SOAP Notes'
                  ? formatTitle(title)
                  : title;

              const recordId = record.id.split('/')[1];

              const formattedDate = format(
                new Date(record.lastUpdated),
                'dd/MM/yyyy'
              );

              /*
               * extract and clean 'Catatan Edukasi Pasien' from result,
               * handling both array and string formats.
               * */
              let cleanDescription = '\\-';
              if (Array.isArray(record.result)) {
                const found = record.result?.find(
                  section => section.label === 'Catatan Edukasi Pasien'
                );
                cleanDescription = found?.value?.replace(/\n\n/g, '. ');
              } else if (
                typeof record.result === 'string' &&
                record.result.trim()
              ) {
                cleanDescription = record.result.replace(/\n\n/g, '. ');
              }

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
                    <div className='flex w-0 grow flex-col justify-center'>
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
                    {record.type === 'SOAP Notes' ||
                    record.type === 'Practitioner Note' ? (
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
            <EmptyState
              className='py-16'
              title='No Records Found'
              subtitle='Try different search, filter or select a patient'
            />
          )}
        </div>
      </ContentWraper>
    </>
  );
}
