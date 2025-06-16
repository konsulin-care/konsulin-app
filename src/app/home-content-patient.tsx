import Avatar from '@/components/general/avatar';
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
  generateAvatarPlaceholder,
  mergeNames,
  parseRecordBundles
} from '@/utils/helper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
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
  const { mutateAsync: getRecords, isLoading: isRecordLoading } =
    useRecordSummary();
  const patientId = authState?.userInfo?.fhirId;
  const queryClient = useQueryClient();

  /*
   * fetch patient records. if a record is a 'Practitioner Note',
   * also fetch the practitioner's profile to include in the result.
   */
  const fetchRecords = async () => {
    const result = await getRecords({ patientId });

    const parsed = parseRecordBundles(result);

    const attachProfile = await Promise.all(
      parsed.map(async item => {
        if (item.type !== 'Practitioner Note') return item;

        const practitionerProfile = await queryClient.fetchQuery({
          queryKey: ['profile-practitioner', item.practitionerId],
          queryFn: () => getProfileById(item.practitionerId, 'Practitioner')
        });

        return { ...item, practitionerProfile };
      })
    );

    const sorted = attachProfile.sort(
      (a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );

    return sorted;
  };

  const { data: records, isLoading: isQueryLoading } = useQuery({
    queryKey: ['patient-records', patientId],
    queryFn: fetchRecords,
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

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

        {isAuthLoading || isRecordLoading || isQueryLoading ? (
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
            {records &&
              records.length > 0 &&
              records.map((record: IRecord) => {
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

                const result = record.result as string;
                const cleanDescription = (result || '\\-').replace(
                  /\n\n/g,
                  '. '
                );

                const queryParams = new URLSearchParams({
                  category: typeMappings[record.type]?.category,
                  title
                }).toString();
                const url = `record/${recordId}?${queryParams}`;

                const { displayName, email } = getPractitionerInfo(record);
                const { initials, backgroundColor } = generateAvatarPlaceholder(
                  {
                    id: record.practitionerId,
                    name: displayName,
                    email: email
                  }
                );
                const photoUrl = record.practitionerProfile?.photo?.[0]?.url;

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
                        <div className='flex w-0 grow flex-col justify-center'>
                          <div className='text-[12px] font-bold'>
                            {formattedTitle}
                          </div>
                          <div className='overflow-hidden text-ellipsis whitespace-nowrap text-[10px]'>
                            <ReactMarkdown
                              components={customMarkdownComponents}
                            >
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
                              className='mr-2 text-xs'
                              imageClassName='mr-2 self-center'
                              height={32}
                              width={32}
                            />
                            <div className='mr-auto text-[12px]'>
                              {displayName}
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
