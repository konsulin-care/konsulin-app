'use client';

import CardLoader from '@/components/general/card-loader';
import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { IUseClinicParams, useClinicById } from '@/services/clinic';
import { IOrganizationResource, IPractitioner } from '@/types/organization';
import { format } from 'date-fns';
import { ChevronLeftIcon, HeartPulse, SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import ClinicFilter from '../clinic-filter';

export interface IDetailClinic {
  params: { clinicId: string };
}

export default function DetailClinic({ params }: IDetailClinic) {
  const [keyword, setKeyword] = useState<string>('');

  const [clinicFilter, setClinicFilter] = useState<IUseClinicParams>({});

  // const {
  //   data: clinicians,
  //   isLoading: isCliniciansLoading,
  //   isFetching: isCliniciansFetching
  // } = useClinicFindAll({
  //   keyword,
  //   filter: clinicFilter,
  //   clinicId: params.clinicId
  // })

  // const { data: detaillClinic, isLoading: isDetaillClinicLoading } =
  //   useClinicFindByID(params.clinicId)

  const {
    clinic,
    newPractitionerData: practitionersData,
    isError,
    isFetching,
    isLoading
  } = useClinicById(params.clinicId);

  const mergeAddress = (clinic: IOrganizationResource) => {
    if (!clinic || !clinic.address || clinic.address.length === 0) return;

    const { city, country, district, postalCode, line } =
      clinic.address[0] || {};

    return [line[0], district, city, country, postalCode]
      .filter(Boolean)
      .join(', ');
  };

  const mergeNames = (practitioner: IPractitioner) => {
    return practitioner.name.map(item => item.given.join(' '));
  };

  const handleClick = (practitioner: IPractitioner) => {
    localStorage.setItem(
      `practitioner-${practitioner.id}`,
      JSON.stringify(practitioner)
    );
  };

  return (
    <>
      <Header>
        <div className='flex w-full items-center'>
          <Link href='/clinic'>
            <ChevronLeftIcon color='white' className='mr-2 cursor-pointer' />
          </Link>
          <div className='text-[14px] font-bold text-white'>Detail Clinic</div>
        </div>
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white p-4'>
        <Image
          className='h-[124px] w-full rounded-lg object-cover'
          src='/images/clinic.jpg'
          width={396}
          height={124}
          alt='detail-clinic'
        />

        <h3 className='mt-2 text-center text-[20px] font-bold'>
          {clinic &&
            clinic.resource.resourceType === 'Organization' &&
            clinic.resource.name}
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
            <span>Alamat</span>
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
            className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
            startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
          />
          <ClinicFilter
            onChange={filter => {
              setClinicFilter(prevState => ({
                ...prevState,
                ...filter
              }));
            }}
          />
        </div>

        <div className='flex gap-4'>
          {clinicFilter.start_date && clinicFilter.end_date && (
            <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
              {format(clinicFilter.start_date, 'dd MMM yy') +
                ' - ' +
                format(clinicFilter.end_date, 'dd MMM yy')}
            </Badge>
          )}
          {clinicFilter.start_time && clinicFilter.end_time && (
            <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
              {clinicFilter.start_time + ' - ' + clinicFilter.end_time}
            </Badge>
          )}
          {clinicFilter.location && (
            <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
              {clinicFilter.location}
            </Badge>
          )}
        </div>

        {isLoading || isFetching || !practitionersData ? (
          <CardLoader />
        ) : practitionersData.length > 0 ? (
          <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
            {practitionersData.map((practitioner: IPractitioner) => (
              <div
                key={practitioner.id}
                className='card flex flex-col items-center'
              >
                <div className='relative flex justify-center'>
                  <Image
                    className='h-[100px] w-[100px] rounded-full object-cover'
                    src={
                      practitioner.photo
                        ? practitioner.photo[0].url
                        : '/images/avatar.jpg'
                    }
                    alt='practitioner'
                    width={100}
                    height={100}
                    unoptimized
                  />

                  {/* TODO: change affiliation into clinic's name. do the same in practitioner card */}
                  <Badge className='absolute bottom-0 flex h-[24px] min-w-[100px] justify-center gap-1 bg-[#08979C] font-normal text-white'>
                    <HeartPulse size={16} color='#08979C' fill='white' />
                    <span>Konsulin</span>
                  </Badge>
                </div>
                <div className='mt-2 text-center font-bold text-primary'>
                  {practitioner.name && mergeNames(practitioner)}
                </div>
                <div className='mt-2 flex flex-wrap justify-center gap-1'>
                  {practitioner.practitionerRole.specialty &&
                    practitioner.practitionerRole.specialty.length &&
                    practitioner.practitionerRole.specialty.map(
                      (item, index) => (
                        <Badge
                          key={index}
                          className='bg-[#E1E1E1] px-2 py-[2px] font-normal'
                        >
                          {item.text}
                        </Badge>
                      )
                    )}
                </div>
                <Link
                  href={{
                    pathname: `/practitioner/${practitioner.id}`,
                    query: {
                      practitionerRoleId: practitioner.practitionerRole.id,
                      clinicId: params.clinicId
                    }
                  }}
                  className='mt-auto w-full'
                >
                  <Button
                    className='mt-2 w-full rounded-[32px] bg-secondary py-2 font-normal text-white'
                    onClick={() => handleClick(practitioner)}
                  >
                    Check
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className='py-16'
            title='No Clinicians Found'
            subtitle='Try Another Clinic.'
          />
        )}
      </div>
    </>
  );
}
