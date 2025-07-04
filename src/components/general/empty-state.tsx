import { cn } from '@/lib/utils'
import Image from 'next/image'

interface IEmptyStateProps {
  title?: string
  subtitle?: string
  size?: number
  className?: string
}

export default function EmptyState({
  title = 'No results',
  subtitle = 'Try a different search or filter.',
  size = 90,
  className
}: IEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-grow flex-col items-center justify-center px-[auto]',
        className
      )}
    >
      <Image
        src={'/images/no-data.svg'}
        alt='no-data'
        width={size}
        height={size}
      />
      <div className='mt-4 font-bold text-muted'>{title}</div>
      <div className='mt-1 text-muted'>{subtitle}</div>
    </div>
  )
}
