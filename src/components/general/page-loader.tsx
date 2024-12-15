import { LoadingSpinnerIcon } from '@/components/icons'

export default function PageLoader() {
  return (
    <div className='flex min-h-screen min-w-full items-center justify-center'>
      <LoadingSpinnerIcon
        width={56}
        height={56}
        className='w-full animate-spin'
      />
    </div>
  )
}
