import NoteIcon from '@/components/icons/note-icon';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { typeMappings } from '@/constants/record';
import { useAuth } from '@/context/auth/authContext';
import { useRecordSummary } from '@/services/api/record';
import { getProfileById } from '@/services/profile';
import { IRecord } from '@/types/record';
import {
  customMarkdownComponents,
  formatTitle,
  mergeNames,
  parseRecordBundles
} from '@/utils/helper';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import AppChartClient from '../components/general/home/app-chart-client';
import AppMenu from '../components/general/home/app-menu';
import Community from '../components/general/home/community';
import PopularAssessment from '../components/general/home/popular-assessment';

export default function HomeContentPatient() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const { mutate: getRecords, isLoading: isRecordLoading } = useRecordSummary();
  const [records, setRecords] = useState<IRecord[] | null>(null);

  /*
   * fetch patient records. if a record is a 'Practitioner Note',
   * also fetch the practitioner's profile to include in the result.
   */
  useEffect(() => {
    if (authState.userInfo.role_name === 'patient') {
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

          const sorted = attachProfile.sort(
            (a, b) =>
              new Date(b.lastUpdated).getTime() -
              new Date(a.lastUpdated).getTime()
          );
          setRecords(sorted);
        }
      });
    }
  }, [authState]);

  return (
    <>
      <AppChartClient />

      <div className='flex gap-4 p-4'>
        <AppMenu />
      </div>

      <PopularAssessment />

      {/* Record Summary */}
      <div className='p-4'>
        <div className='flex justify-between text-muted'>
          <span className='mb-2 text-[14px] font-bold'>
            Previous Record Summary
          </span>
          <Link className='text-[12px]' href={'/record'}>
            See All
          </Link>
        </div>

        {!records ||
        records.length === 0 ||
        isAuthLoading ||
        isRecordLoading ? (
          <Skeleton
            count={1}
            className='h-[100px] w-full bg-[hsl(210,40%,96.1%)]'
          />
        ) : (
          <Swiper
            pagination={{
              dynamicBullets: true,
              clickable: true,
              renderBullet: function (index, className) {
                return `
                <span class="${className}" 
                    style="
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    margin: 0 4px;
                    border-radius: 50%;
                    background: #d1d5db;
                    transition: all 0.3s ease;
                ">
                </span>
                `;
              }
            }}
            spaceBetween={10}
            modules={[Pagination]}
          >
            {records.map((record: IRecord) => {
              const splitTitle = record.title.split('/');
              const title = splitTitle[1] ? splitTitle[1] : splitTitle[0];
              const formattedTitle = formatTitle(title);
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

              return (
                <SwiperSlide key={recordId}>
                  <Link
                    href={url}
                    className='card mb-4 !flex flex-col gap-2 p-4'
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
                        <div className='overflow-hidden text-ellipsis whitespace-nowrap text-[10px]'>
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
                          <Image
                            className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
                            width={32}
                            height={32}
                            alt='offline'
                            src={
                              record.practitionerProfile?.photo?.[0]?.url ||
                              '/images/avatar.jpg'
                            }
                          />
                          <div className='mr-auto text-[12px]'>
                            {mergeNames(
                              record.practitionerProfile?.name,
                              record.practitionerProfile?.qualification
                            )}
                          </div>
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
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}
      </div>

      <div className='p-4'>
        <Community />
      </div>
    </>
  );
}
