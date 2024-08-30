import Image from 'next/image'

interface IEmptyStateProps {
  title?: string
  subtitle?: string
}

export default function EmptyState({
  title = 'No results',
  subtitle = 'Try a different search or filter.'
}) {
  return (
    <div className='flex w-full flex-grow flex-col items-center justify-center px-[auto] py-16'>
      <Image src={'/images/no-data.svg'} alt='no-data' width={90} height={90} />
      <div className='mt-4 font-bold text-muted'>{title}</div>
      <div className='mt-1 text-muted'>{subtitle}</div>
    </div>
  )
}
