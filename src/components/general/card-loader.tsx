import { Skeleton } from '../ui/skeleton'

export default function CardLoader({ item = 6, ...props }) {
  return (
    <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
      {Array(item)
        .fill(undefined)
        .map((_, index: number) => (
          <Skeleton
            key={index}
            className='h-[125px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
          />
        ))}
    </div>
  )
}
