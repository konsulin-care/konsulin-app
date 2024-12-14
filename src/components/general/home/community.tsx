import Image from 'next/image'
import Link from 'next/link'

export default function Community() {
  return (
    <Link href={'/comunity'} className='card flex'>
      <Image
        src={'/images/mental-health.svg'}
        width={40}
        height={40}
        alt='writing'
      />
      <div className='ml-2 flex flex-col'>
        <span className='text-[12px] font-bold text-primary'>Community</span>
        <span className='text-[10px] text-primary'>
          Meet with new friend in community
        </span>
      </div>
    </Link>
  )
}
