import Image from 'next/image'
import Link from 'next/link'

export default function Schedule({ name, time, date }) {
  return (
    <div className='pt-4'>
      <div className='flex justify-between'>
        <p className='text-sm font-bold text-[#2C2F35] opacity-60'>
          Schedule Active
        </p>
        <Link href='/' className='text-sm text-[#2C2F35] opacity-60'>
          See All
        </Link>
      </div>
      <div className='flex items-center justify-between'>
        <div className='p-4'>
          <Image
            src={'icons/calendar.svg'}
            alt='calendar-icons'
            width={26}
            height={25}
          />
        </div>
        <div className='flex flex-grow flex-col items-start'>
          <p className='text-xs text-[#2C2F35] opacity-60'>
            Upcoming Session With
          </p>
          <p className='text-sm font-bold text-[#10958D]'>{name}</p>
        </div>
        <div className='p-4 text-xs'>
          <span className='font-bold'>{time}</span> | {date}
        </div>
      </div>
    </div>
  )
}
