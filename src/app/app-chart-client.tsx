import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import Link from 'next/link'

export default function AppChartClient({
  isBlur = false
}: {
  isBlur?: boolean
}) {
  const Pie = dynamic(
    () => import('@ant-design/plots').then(mod => mod.Pie) as any,
    { ssr: false }
  )

  const configPie: any = {
    data: [
      { type: 'Depress', value: 27 },
      { type: 'Anxiety', value: 25 },
      { type: 'Intrusive Thoughts', value: 18 },
      { type: 'Paranoia', value: 15 },
      { type: 'Insomnia', value: 10 },
      { type: 'Emotional Exhaustion', value: 5 }
    ],
    angleField: 'value',
    colorField: 'type',
    scale: { color: { palette: 'buGn' } },
    legend: {
      color: {
        title: false,
        position: 'right',
        rowPadding: 4
      }
    }
  }
  return (
    <div className='relative flex flex-col items-center justify-center p-4'>
      <div className='p-[16px]s min-h-[150px] w-full rounded-lg bg-[#F9F9F9] p-4'>
        <div className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
          What’s the turbulence on your mind?
        </div>
        <div
          className={cn('w-full', {
            'blur-sm': isBlur
          })}
        >
          <div className='min-h-[150px]'>
            <Pie height={180} {...configPie} />
          </div>
          <div className='text-[10px]'>
            *based on your data previous record, not necessarily in recent
            period
          </div>
        </div>
      </div>

      <Link
        href='/login'
        className={
          isBlur
            ? 'absolute m-auto flex h-full w-full flex-grow items-center justify-center text-[14px] font-bold'
            : 'hidden'
        }
      >
        <Button className='bg-secondary text-white shadow-md'>
          Silakan Login untuk akses lengkap
        </Button>
      </Link>
    </div>
  )
}
