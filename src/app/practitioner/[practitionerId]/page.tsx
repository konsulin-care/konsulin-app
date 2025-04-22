'use client';

import Header from '@/components/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth/authContext';
import { useBooking } from '@/context/booking/bookingContext';
import { useDetailPractitioner } from '@/services/clinic';
import { IPractitioner } from '@/types/organization';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  HospitalIcon
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PractitionerAvailbility from '../practitioner-availbility';

export interface IPractitionerProps {
  params: { practitionerId: string };
}

export default function Practitioner({ params }: IPractitionerProps) {
  const { state: authState } = useAuth();
  const { state: bookingState, dispatch } = useBooking();

  const searchParams = useSearchParams();
  const clinicId = searchParams.get('clinicId');
  const practitionerRoleId = searchParams.get('practitionerRoleId');

  const router = useRouter();

  const practitionerData = JSON.parse(
    localStorage.getItem(`practitioner-${params.practitionerId}`)
  );

  // const { data: detailClinician, isLoading: isDetailClinicianLoading } =
  //   useDetailClinicianByClinic({
  //     clinician_id: params.practitionerRoleId,
  //     clinic_id: clinicId
  //   });

  // useEffect(() => {
  //   dispatch({
  //     type: 'UPDATE_BOOKING_INFO',
  //     payload: {
  //       detailClinicianByClinicianID: detailClinician
  //     }
  //   });
  // }, [detailClinician]);

  const {
    newData: detailPractitioner,
    isLoading,
    isError,
    isFetching
  } = useDetailPractitioner(practitionerRoleId);

  const mergeNames = (practitioner: IPractitioner) => {
    if (!practitioner.name || practitioner.name.length === 0) {
      return '-';
    }
    return practitioner.name.map(item => item.given.join(' '));
  };

  return (
    <>
      <Header>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />
          <div className='text-[14px] font-bold text-white'>
            Detail Practitioner
          </div>
        </div>
      </Header>

      {isLoading ||
      isError ||
      isFetching ||
      !detailPractitioner ||
      !practitionerData ? (
        <div>Loading...</div>
      ) : (
        <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
          <div className='flex flex-col items-center'>
            <div className='flex flex-col items-center'>
              <Image
                className='h-[100px] w-[100px] rounded-full object-cover'
                src={
                  practitionerData.photo
                    ? practitionerData.photo[0].url
                    : '/images/avatar.jpg'
                }
                alt='practitioner'
                width={100}
                height={100}
                unoptimized
              />

              <Badge className='mt-[-15px] flex min-h-[24px] min-w-[100px] bg-[#08979C] text-center font-normal text-white'>
                {detailPractitioner.organization.name}
              </Badge>
            </div>
            <h3 className='mt-2 text-center text-[20px] font-bold'>
              {/* {params.practitionerId} */}
              {mergeNames(practitionerData)}
            </h3>
          </div>

          <PractitionerAvailbility practitioner={practitionerData}>
            <div className='card mt-4 flex cursor-pointer items-center border-0 bg-[#F9F9F9] p-4'>
              <CalendarDaysIcon size={24} color='#13C2C2' className='mr-2' />
              <span className='mr-auto text-[12px] font-bold'>
                See Availbility
              </span>
              <ArrowRightIcon color='#13C2C2' />
            </div>
          </PractitionerAvailbility>

          <div className='card mt-4 flex flex-col border-0 bg-[#F9F9F9] p-4'>
            <div className='flex items-center'>
              <HospitalIcon size={24} color='#13C2C2' className='mr-2' />
              <span className='text-[12px] font-bold'>
                Practice Information
              </span>
            </div>
            <div className='mt-4 flex flex-col space-y-2'>
              <div className='flex justify-between text-[12px]'>
                <span className='mr-2'>Affiliation</span>
                <span className='font-bold'>
                  {detailPractitioner.organization.name}
                </span>
              </div>
              {/* NOTE: not provided by api */}
              {/* <div className='flex justify-between text-[12px]'> */}
              {/*   <span className='mr-2'>Experience</span> */}
              {/*   <span className='font-bold'>2 Year</span> */}
              {/* </div> */}
              <div className='flex justify-between text-[12px]'>
                <span className='mr-2'>Fee</span>
                <span className='font-bold'>
                  {detailPractitioner.invoice?.totalNet
                    ? `${new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: detailPractitioner.invoice.totalNet.currency,
                        minimumFractionDigits: 0
                      }).format(
                        detailPractitioner.invoice.totalNet.value
                      )} / Session`
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          {practitionerData.practitionerRole.specialty && (
            <div className='card mt-4 flex flex-col border-0 bg-[#F9F9F9]'>
              <div className='flex items-center'>
                <HospitalIcon size={32} color='#13C2C2' className='mr-2' />
                <span className='text-[12px] font-bold'>Specialty</span>
              </div>

              <div className='mt-4 flex flex-wrap gap-2'>
                {practitionerData.practitionerRole.specialty.length > 0 &&
                  practitionerData.practitionerRole.specialty.map(
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
            </div>
          )}

          {authState.isAuthenticated ? (
            <Link
              href={{
                pathname: `/practitioner/${params.practitionerId}/book-practitioner`,
                query: { clinicId }
              }}
              className='mt-auto w-full'
            >
              <Button className='mt-2 w-full rounded-[32px] bg-secondary py-2 text-[14px] font-bold text-white'>
                Book Session
              </Button>
            </Link>
          ) : (
            <Link href={'/register'} className='mt-auto w-full'>
              <Button className='mt-2 w-full rounded-[32px] bg-secondary py-2 text-[14px] font-bold text-white'>
                Silakan Daftar atau Masuk untuk Booking
              </Button>
            </Link>
          )}
        </div>
      )}
    </>
  );
}

// previously implemented
// {isDetailClinicianLoading ? (
//   <div>Loading...</div>
// ) : (
//   <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
//     <div className='flex flex-col items-center'>
//       <div className='flex flex-col items-center'>
//         <Image
//           className='h-[100px] w-[100px] rounded-full object-cover'
//           src='/images/avatar.jpg'
//           alt='clinic'
//           width={100}
//           height={100}
//         />
//
//         <Badge className='mt-[-15px] flex min-h-[24px] min-w-[100px] bg-[#08979C] text-center font-normal text-white'>
//           {detailClinician.practice_information.affiliation}
//         </Badge>
//       </div>
//       <h3 className='mt-2 text-center text-[20px] font-bold'>
//         {params.practitionerId}
//       </h3>
//     </div>
//
//     <PractitionerAvailbility>
//       <div className='card mt-4 flex cursor-pointer items-center border-0 bg-[#F9F9F9] p-4'>
//         <CalendarDaysIcon size={24} color='#13C2C2' className='mr-2' />
//         <span className='mr-auto text-[12px] font-bold'>
//           See Availbility
//         </span>
//         <ArrowRightIcon color='#13C2C2' />
//       </div>
//     </PractitionerAvailbility>
//
//     <div className='card mt-4 flex flex-col border-0 bg-[#F9F9F9] p-4'>
//       <div className='flex items-center'>
//         <HospitalIcon size={24} color='#13C2C2' className='mr-2' />
//         <span className='text-[12px] font-bold'>
//           Practice Information
//         </span>
//       </div>
//       <div className='mt-4 flex flex-col space-y-2'>
//         <div className='flex justify-between text-[12px]'>
//           <span className='mr-2'>Affiliation</span>
//           <span className='font-bold'>
//             {detailClinician.practice_information.affiliation}
//           </span>
//         </div>
//         <div className='flex justify-between text-[12px]'>
//           <span className='mr-2'>Experience</span>
//           <span className='font-bold'>2 Year</span>
//         </div>
//         <div className='flex justify-between text-[12px]'>
//           <span className='mr-2'>Fee</span>
//           <span className='font-bold'>
//             {`${new Intl.NumberFormat('id-ID', {
//               style: 'currency',
//               currency:
//                 detailClinician.practice_information.price_per_session
//                   .currency,
//               minimumFractionDigits: 0
//             }).format(
//               detailClinician.practice_information.price_per_session.value
//             )} / Session
//             `}
//           </span>
//         </div>
//       </div>
//     </div>
//
//     <div className='card mt-4 flex flex-col border-0 bg-[#F9F9F9]'>
//       <div className='flex items-center'>
//         <HospitalIcon size={32} color='#13C2C2' className='mr-2' />
//         <span className='text-[12px] font-bold'>Specialty</span>
//       </div>
//
//       <div className='mt-4 flex flex-wrap gap-2'>
//         {detailClinician.practice_information.specialties.map(
//           specialty => (
//             <Badge
//               key={specialty}
//               className='bg-[#E1E1E1] px-2 py-[2px] font-normal'
//             >
//               {specialty}
//             </Badge>
//           )
//         )}
//       </div>
//     </div>
//
//     {authState.isAuthenticated ? (
//       <Link
//         href={{
//           pathname: `/practitioner/${params.practitionerId}/book-practitioner`,
//           query: { clinicId }
//         }}
//         className='mt-auto w-full'
//       >
//         <Button className='mt-2 w-full rounded-[32px] bg-secondary py-2 text-[14px] font-bold text-white'>
//           Book Session
//         </Button>
//       </Link>
//     ) : (
//       <Link href={'/register'} className='mt-auto w-full'>
//         <Button className='mt-2 w-full rounded-[32px] bg-secondary py-2 text-[14px] font-bold text-white'>
//           Silakan Daftar atau Masuk untuk Booking
//         </Button>
//       </Link>
//     )}
//   </div>
// )}
