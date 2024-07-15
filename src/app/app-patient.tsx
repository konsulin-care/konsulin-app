import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import HomeMenuClinicianGuest from './app-menu-clinician-guest'
import Community from './community'
import PopularAssesment from './popular-assesment'

const Pie = dynamic(
  () => import('@ant-design/plots').then(mod => mod.Pie) as any,
  { ssr: false }
)

const configPie: any = {
  data: [
    { type: 'Depress', value: 27 },
    { type: 'Anxiety', value: 25 },
    { type: 'Intrusive Thoughts', value: 18 },
    { type: 'Paranoia', value: 15 },
    { type: 'Insomnia', value: 10 },
    { type: 'Emotional Exhaustion', value: 5 }
  ],
  angleField: 'value',
  colorField: 'type',
  scale: { color: { palette: 'buGn' } },
  legend: {
    color: {
      title: false,
      position: 'right',
      rowPadding: 4
    }
  }
}

export default function AppPatient() {
  return (
    <div className='mt-[-24px] rounded-[16px] bg-white'>
      <div className='p-4'>
        <div className='rounded-lg bg-[#F9F9F9] p-[16px]'>
          <div className='text-[14px] font-bold text-[#2C2F3599]'>
            What’s the turbulence on your mind?
          </div>
          <div className=''>
            <Pie height={180} {...configPie} />
          </div>
          <div className='text-[10px]'>
            *based on your data previous record, not necessarily in recent
            period
          </div>
        </div>
      </div>

      <div className='flex gap-4 p-4'>
        <HomeMenuClinicianGuest />
      </div>

      <PopularAssesment />

      {/* Record Summary */}
      <div className='p-4'>
        <div className='flex justify-between text-muted'>
          <span className='mb-2 text-[14px] font-bold'>
            Previous Record Summary
          </span>
          <Link className='text-[12px]' href={'/'}>
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
    </div>
  )
}
