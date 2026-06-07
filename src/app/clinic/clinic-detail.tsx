/* eslint-disable max-lines -- 300-line limit is too tight for component files */

'use client';

import Avatar from '@/components/general/avatar';
import CardLoader from '@/components/general/card-loader';
import EmptyState from '@/components/general/empty-state';
import PageHeader from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { STORES, dbSet } from '@/lib/indexeddb';
import { IUseClinicParams, useClinicById } from '@/services/clinic';
import { IOrganizationResource, IPractitioner } from '@/types/organization';
import {
  generateAvatarPlaceholder,
  mergeNames,
  parseTime
} from '@/utils/helper';
import { format, setHours, setMinutes } from 'date-fns';
import { HeartPulse, SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import ClinicFilter from './clinic-filter';

// generates an array of 3-letter weekday abbreviations from given date range
const generateFilterDays = (start: Date, end: Date) => {
  const filterDays = [];
  const currentDate = new Date(start);

  while (currentDate <= new Date(end)) {
    const weekday = currentDate
      .toLocaleDateString('en-US', { weekday: 'short' })
      .toLowerCase();
    filterDays.push(weekday);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return filterDays;
};

/** Check if a slot's days and time overlap with the given filter range. */
const isSlotAvailable = ({
  slot,
  filterDays,
  filterStartTime,
  filterEndTime,
  practitionerStartTime,
  practitionerEndTime
}: Readonly<{
  slot: { daysOfWeek?: string[] };
  filterDays: string[];
  filterStartTime: Date;
  filterEndTime: Date;
  practitionerStartTime: Date;
  practitionerEndTime: Date;
}>) => {
  const slotDays = slot.daysOfWeek.map((day: string) => day.toLowerCase());
  const isDayMatch = slotDays.some((day: string) => filterDays.includes(day));

  if (!isDayMatch) return false;

  return (
    practitionerStartTime.getTime() <= filterEndTime.getTime() &&
    practitionerEndTime.getTime() >= filterStartTime.getTime()
  );
};

/** Clinic detail page showing practitioners, filters, and booking. */
export default function ClinicDetail() {
  const searchParams = useSearchParams();
  const clinicId = searchParams.get('clinicId') ?? '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [keyword, setKeyword] = useState<string>('');

  const [practitionerFilter, setPractitionerFilter] =
    useState<IUseClinicParams>({});

  const {
    clinic,
    newPractitionerData: practitionersData,
    isFetching,
    isLoading
  } = useClinicById(clinicId);

  /** Merge organization address fields into a single string. */
  const mergeAddress = (clinic: IOrganizationResource): string | undefined => {
    const address = clinic?.address?.[0];
    if (!address) return undefined;

    const { city, country, district, postalCode, line } = address;

    return [line[0], district, city, country, postalCode]
      .filter(Boolean)
      .join(', ');
  };

  /** Navigate to the practitioner's booking page. */
  const handleSelectPractitioner = (practitioner: IPractitioner) => {
    if (!practitioner) return;

    const email = practitioner.telecom?.find(item => item.system === 'email');

    dbSet(STORES.uiPreferences, {
      ownerId: '',
      prefKey: 'selected_practitioner',
      value: {
        roleId: practitioner.practitionerRole.id,
        name: practitioner.name,
        photo: practitioner.photo,
        qualification: practitioner.qualification,
        email: email?.value
      }
    }).catch(err => console.warn('[IndexedDB]', err));
  };

  const filteredPractitioners = useMemo(() => {
    if (
      !keyword &&
      Object.keys(practitionerFilter).every(
        key => practitionerFilter[key] === undefined
      )
    ) {
      return practitionersData;
    }

    const lowerKeyword = keyword.trim().toLowerCase();
    const { start_date, end_date, start_time, end_time } = practitionerFilter;

    const hasDateFilter = Boolean(start_date) && Boolean(end_date);
    const hasTimeFilter = Boolean(start_time) || Boolean(end_time);

    const filterDays = hasDateFilter
      ? generateFilterDays(start_date, end_date)
      : [];

    const filterStartTime = start_time
      ? parseTime(start_time, 'HH:mm')
      : setHours(setMinutes(new Date(), 0), 0); // default to 00:00

    const filterEndTime = end_time
      ? parseTime(end_time, 'HH:mm')
      : setHours(setMinutes(new Date(), 59), 23); // default to 23:59

    return practitionersData.filter((practitioner: IPractitioner) => {
      // name filtering
      const fullName = mergeNames(
        practitioner.name,
        practitioner.qualification
      );
      if (!fullName) return false;

      const cleanFullName = fullName.trim().toLowerCase().replace(/\s+/g, ' ');
      if (lowerKeyword && !cleanFullName.includes(lowerKeyword)) {
        return false;
      }

      // availability filtering**
      const { availableTime } = practitioner.practitionerRole;
      if (!availableTime || availableTime.length === 0) return false;

      // if no date or time filters applied, skip availability filtering
      if (!hasDateFilter && !hasTimeFilter) return true;

      return availableTime.some(slot => {
        const practitionerStartTime = parseTime(
          slot.availableStartTime,
          'HH:mm:ss'
        );
        const practitionerEndTime = parseTime(
          slot.availableEndTime,
          'HH:mm:ss'
        );

        return isSlotAvailable({
          slot,
          filterDays,
          filterStartTime,
          filterEndTime,
          practitionerStartTime,
          practitionerEndTime
        });
      });
    });
  }, [practitionersData, practitionerFilter, keyword]);

  const displayOrganizationName = useMemo(() => {
    if (!clinic || clinic?.resource?.resourceType !== 'Organization')
      return '-';

    return clinic.resource?.name ?? '-';
  }, [clinic]);

  const renderPractitionerGrid = () => {
    if (isLoading || isFetching || !filteredPractitioners) {
      return <CardLoader />;
    }
    if (filteredPractitioners.length === 0) {
      return (
        <EmptyState
          className='py-16'
          title='No Practitioners Found'
          subtitle='Try Another Clinic.'
        />
      );
    }
    return (
      <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
        {practitionersData.map((practitioner: IPractitioner) => {
          const displayName = mergeNames(
            practitioner.name,
            practitioner.qualification
          );
          const email = practitioner.telecom.find(
            item => item.system === 'email'
          );
          const { initials, backgroundColor, seed } = generateAvatarPlaceholder(
            {
              id: practitioner.id,
              name: displayName,
              email: email?.value
            }
          );
          const photoUrl = practitioner.photo?.[0]?.url;

          return (
            <div
              key={practitioner.id}
              className='card flex flex-col items-center'
            >
              <div className='relative flex justify-center'>
                <Avatar
                  seed={seed}
                  initials={initials}
                  backgroundColor={backgroundColor}
                  photoUrl={photoUrl}
                  className='text-2xl'
                />
                <Badge className='absolute bottom-0 flex h-[24px] min-w-[100px] justify-center gap-1 bg-[#08979C] font-normal text-white'>
                  <HeartPulse size={16} color='#08979C' fill='white' />
                  <span className='whitespace-nowrap'>
                    {displayOrganizationName}
                  </span>
                </Badge>
              </div>
              <div className='text-primary mt-2 text-center font-bold'>
                {displayName}
              </div>
              <div className='mt-2 flex flex-wrap justify-center gap-1'>
                {practitioner.practitionerRole.specialty?.map(specialty => (
                  <Badge
                    key={specialty.text}
                    className='bg-[#E1E1E1] px-2 py-[2px] font-normal'
                  >
                    {specialty.text}
                  </Badge>
                ))}
              </div>
              <Link
                href={`/practitioner?practitionerRoleId=${practitioner.practitionerRole.id}`}
                className='mt-auto w-full'
              >
                <Button
                  className='btn-soft-gray mt-2 w-full rounded-[32px] py-2 font-normal'
                  onClick={() => handleSelectPractitioner(practitioner)}
                >
                  <b>View Practice Information</b>
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        pageIndicator={`Check Out ${displayOrganizationName}`}
        backRoute='/clinic'
      />
      <div className='mt-[-24px] rounded-[16px] bg-white p-4'>
        <Image
          className='h-[124px] w-full rounded-lg object-cover'
          src='/images/clinic.jpg'
          width={396}
          height={124}
          alt='detail-clinic'
        />

        <h3 className='mt-2 text-center text-[20px] font-bold'>
          {displayOrganizationName}
        </h3>

        <div className='card mt-2 border-0 bg-[#F9F9F9] p-4 text-[12px]'>
          <div className='mb-4 flex items-center gap-2 text-[14px]'>
            <Image
              src={'/icons/hospital.svg'}
              alt='clinic'
              width={22}
              height={22}
            />
            <div className='font-bold'>Clinic Information</div>
          </div>
          <div className='flex justify-between'>
            <span>Affiliation</span>
            <span className='font-bold'>Konsulin</span>
          </div>
          <div className='mt-2 flex flex-col'>
            <span>Address</span>
            <span className='font-bold'>
              {clinic && mergeAddress(clinic.resource as IOrganizationResource)}
            </span>
          </div>
        </div>

        <div className='mt-4 flex gap-4'>
          <InputWithIcon
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder='Search'
            className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
            startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
          />
          <ClinicFilter
            onChange={(filter: IUseClinicParams) => {
              setPractitionerFilter((prevState: IUseClinicParams) => ({
                ...prevState,
                ...filter
              }));
            }}
            type='practitioner'
          />
        </div>

        <div className='flex gap-4'>
          {practitionerFilter.start_date && practitionerFilter.end_date && (
            <Badge className='bg-secondary mt-4 rounded-md px-4 py-[3px] font-normal text-white'>
              {`${format(practitionerFilter.start_date, 'dd MMM yy')} - ${format(practitionerFilter.end_date, 'dd MMM yy')}`}
            </Badge>
          )}
          {practitionerFilter.start_time && practitionerFilter.end_time && (
            <Badge className='bg-secondary mt-4 rounded-md px-4 py-[3px] font-normal text-white'>
              {`${practitionerFilter.start_time} - ${practitionerFilter.end_time}`}
            </Badge>
          )}
        </div>

        {renderPractitionerGrid()}
      </div>
    </>
  );
}
