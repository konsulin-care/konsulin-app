import Image from 'next/image'
import Link from 'next/link'

export default function HomeMenuClinicianGuest() {
  return (
    <>
      <Link href={'/exercise'} className='card flex w-full'>
        <Image
          src={'/images/mental-health.svg'}
          width={40}
          height={40}
          alt='writing'
        />
        <div className='ml-2 flex flex-col'>
          <span className='text-[12px] font-bold text-primary'>Relax Time</span>
          <span className='text-[10px] text-primary'>
            Relax for Better Mental Health
          </span>
        </div>
      </Link>

      <Link href={'/assessment'} className='card flex w-full'>
        <Image
          src={'/images/writing.svg'}
          width={40}
          height={40}
          alt='writing'
        />
        <div className='ml-2 flex flex-col'>
          <span className='text-[12px] font-bold text-primary'>
            Start Writting
          </span>
          <span className='text-[10px] text-primary'>
            Express your current feelings
          </span>
        </div>
      </Link>
    </>
  )
}
