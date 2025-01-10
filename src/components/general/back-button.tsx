'use client'

import { ChevronLeftIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

const BackButton = ({ size = 32 }: { size?: number }) => {
  const router = useRouter()

  const handleBackClick = () => {
    router.back()
  }

  return (
    <ChevronLeftIcon
      size={size}
      onClick={handleBackClick}
      color='white'
      className='mr-2 cursor-pointer'
    />
  )
}

export default BackButton
