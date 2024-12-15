'use client'

import { ChevronLeftIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

const BackButton = () => {
  const router = useRouter()

  const handleBackClick = () => {
    router.back()
  }

  return (
    <ChevronLeftIcon
      onClick={handleBackClick}
      color='white'
      className='mr-2 cursor-pointer'
    />
  )
}

export default BackButton
