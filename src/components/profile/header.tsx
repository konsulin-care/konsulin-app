import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Header({ title }) {
  const router = useRouter()

  return (
    <div
      className={`bg-secondary bg-[url('/images/nav-banner.svg')] bg-right-top bg-no-repeat`}
    >
      <div className='flex items-center justify-between p-[16px] pb-[40px]'>
        <ChevronLeft
          width={24}
          height={24}
          onClick={() => router.back()}
          color='white'
        />
        <div className='flex flex-grow items-center justify-center pr-[24px] text-sm font-bold text-white'>
          {title}
        </div>
      </div>
    </div>
  )
}
