'use client';

import CardLoader from '@/components/general/card-loader';
import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import NavigationBar from '@/components/navigation-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { IUseClinicParams, useListClinics } from '@/services/clinic';
import { IOrganizationEntry } from '@/types/organization';
import { removeCityPrefix } from '@/utils/helper';
import dayjs from 'dayjs';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import ClinicFilter from './clinic-filter';

export default function Clinic() {
  const [clinicFilter, setClinicFilter] = useState<IUseClinicParams>({});
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: clinics, isLoading } = useListClinics({
    searchTerm,
    cityFilter: removeCityPrefix(clinicFilter.city)
  });

  return (
    <>
      <NavigationBar />
      <Header>
        <div className='flex w-full flex-col'>
          <div className='text-[14px] font-bold text-white'>Book Session</div>
          <div className='mt-4 flex items-center justify-between'>
            <div className='text-[14px] font-bold text-white'>
              Schedule Active
            </div>
            <Link href='/schedule' className='text-[10px] text-white'>
              See All
            </Link>
          </div>
          <div className='card mt-4 flex items-center bg-[#F9F9F9]'>
            <Image
              className='mr-[10px] min-h-[32] min-w-[32]'
              src={'/icons/calendar.svg'}
              width={32}
              height={32}
              alt='calendar'
            />
            <div className='mr-auto flex flex-col'>
              <span className='text-[12px] text-muted'>
                Upcoming Session With
              </span>
              <span className='text-[14px] font-bold text-secondary'>
                Mrs Clinician Name
              </span>
            </div>
            <div className='s'>
              <span className='text-[12px] font-bold'>
                {dayjs().format('HH:mm')} |{' '}
              </span>
              <span className='text-[12px]'>
                {dayjs().format('DD/MM/YYYY')}
              </span>
            </div>
          </div>
        </div>
      </Header>
      <ContentWraper>
        <div className='w-full p-4'>
          <div className='flex gap-4'>
            <InputWithIcon
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder='Search'
              className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            />
            <ClinicFilter
              onChange={(filter: IUseClinicParams) => {
                setClinicFilter(prevState => ({
                  ...prevState,
                  ...filter
                }));
              }}
              type='clinic'
            />
          </div>

          <div className='flex gap-4'>
            {/* {clinicFilter.start_date && clinicFilter.end_date && ( */}
            {/*   <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'> */}
            {/*     {clinicFilter.start_date == clinicFilter.end_date */}
            {/*       ? format(clinicFilter.start_date, 'dd MMM yy') */}
            {/*       : format(clinicFilter.start_date, 'dd MMM yy') + */}
            {/*         ' - ' + */}
            {/*         format(clinicFilter.end_date, 'dd MMM yy')} */}
            {/*   </Badge> */}
            {/* )} */}
            {/* {clinicFilter.start_time && clinicFilter.end_time && ( */}
            {/*   <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'> */}
            {/*     {clinicFilter.start_time + ' - ' + clinicFilter.end_time} */}
            {/*   </Badge> */}
            {/* )} */}
            {clinicFilter.city && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {clinicFilter.city}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <CardLoader />
          ) : clinics.length > 0 ? (
            <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
              {clinics.map((clinic: IOrganizationEntry) => (
                <div
                  key={clinic.resource.id}
                  className='card flex flex-col items-center'
                >
                  <Image
                    className='h-[100px] w-full rounded-lg object-cover'
                    src='/images/clinic.jpg'
                    alt='clinic'
                    width={158}
                    height={100}
                  />
                  <div className='mt-2 text-center font-bold text-primary'>
                    {clinic.resource.resourceType === 'Organization' &&
                      clinic.resource.name}
                  </div>
                  <Link
                    href={`/clinic/${clinic.resource.id}`}
                    className='w-full'
                  >
                    <Button className='mt-2 w-full rounded-[32px] bg-secondary py-2 font-normal text-white'>
                      Check
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState className='py-16' />
          )}
        </div>
      </ContentWraper>
    </>
  );
}
