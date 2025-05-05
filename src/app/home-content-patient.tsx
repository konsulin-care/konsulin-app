import NoteIcon from '@/components/icons/note-icon';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { typeMappings } from '@/constants/record';
import { useAuth } from '@/context/auth/authContext';
import { useRecordSummary } from '@/services/api/record';
import { IRecord } from '@/types/record';
import { customMarkdownComponents, parseRecordBundles } from '@/utils/helper';
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

  return (
    <>
      {/* TODO: add upcoming session with */}
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
            className='h-[90px] w-full bg-[hsl(210,40%,96.1%)]'
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
                <SwiperSlide key={record.id}>
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
                          {record.title}
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
