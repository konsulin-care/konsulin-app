import Image from 'next/image'
import Link from 'next/link'
import AppChartClient from '../components/general/home/app-chart-client'
import AppMenu from '../components/general/home/app-menu'
import Community from '../components/general/home/community'
import PopularAssesment from '../components/general/home/popular-assesment'

export default function HomeContentPatient() {
  return (
    <>
      <AppChartClient />

      <div className='flex gap-4 p-4'>
        <AppMenu />
      </div>

      <PopularAssesment />

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
        <Link href={'/'} className='card mt-4 flex flex-col gap-2 p-4'>
          <div className='flex'>
            <div className='mr-2 h-[40px] w-[40px] rounded-full bg-[#F8F8F8] p-2'>
              <Image
                className='h-[24px] w-[24px] object-cover'
                src={'/images/note.svg'}
                width={24}
                height={24}
                alt='note'
              />
            </div>
            <div className='flex flex-col'>
              <div className='text-[12px] font-bold'>
                Tingkatkan Rasa Tenangmu
              </div>
              <div className='text-[10px]'>
                Hasil pemeriksaan menunjukkan kondisi kesejahteraan mental Anda
                dan memberikan arahan untuk perawatan lebih lanjut
              </div>
            </div>
          </div>
          <hr className='w-full' />
          <div className='flex items-center'>
            <Image
              className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
              width={32}
              height={32}
              alt='offline'
              src={'/images/avatar.jpg'}
            />

            <div className='mr-auto text-[12px]'>Dr.Fitra Gunawan</div>
            <div className='text-[10px]'>12/12/2025</div>
          </div>
        </Link>
      </div>

      <div className='p-4'>
        <Community />
      </div>
    </>
  )
}
