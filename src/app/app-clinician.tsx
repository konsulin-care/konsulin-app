import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import Community from './community'

export default function AppClinician() {
  const Column = dynamic(
    () => import('@ant-design/plots').then(mod => mod.Column) as any,
    { ssr: false }
  )

  const dataWeekly: any = {
    data: [
      { type: 'Mon', value: 3 },
      { type: 'Tue', value: 5 },
      { type: 'Wed', value: 1 },
      { type: 'Thu', value: 6 },
      { type: 'Sat', value: 5 },
      { type: 'Fri', value: 3 },
      { type: 'Sun', value: 2 }
    ]
  }

  const dataMonthly: any = {
    data: [
      { type: 'Jan', value: 3 },
      { type: 'Feb', value: 5 },
      { type: 'Mar', value: 1 },
      { type: 'Apr', value: 6 },
      { type: 'May', value: 5 },
      { type: 'Jun', value: 3 },
      { type: 'Jul', value: 6 },
      { type: 'Aug', value: 8 },
      { type: 'Sep', value: 5 },
      { type: 'Oct', value: 9 },
      { type: 'Nov', value: 2 },
      { type: 'Dec', value: 7 }
    ]
  }

  const configColumn: any = {
    axis: {
      x: false,
      y: false
    },
    xField: 'type',
    yField: 'value',
    style: {
      fill: ({ type }) => {
        if (type === 'Sun') {
          return '#13C2C2'
        }
        return '#ABDCDB'
      },
      // radiusTopRight: 6,
      radius: 6,
      paddingBottom: 10
    },
    label: {
      position: 'bottom',
      text: originData => originData.value
    },
    legend: false,
    arrow: false,
    tooltip: false
  }
  return (
    <div className='mt-[-24px] rounded-[16px] bg-white'>
      <div className='p-4'>
        <div className='rounded-lg bg-[#F9F9F9] p-[16px]'>
          <div className='mb-4 flex justify-between'>
            <div className='text-[14px] font-bold text-[#2C2F3599]'>
              Handled Sessions
            </div>
            <Link className='text-[12px] text-secondary' href={'/'}>
              Generate Report
            </Link>
          </div>
          <Tabs defaultValue='weekly' className='w-full'>
            <TabsList className='grid h-fit w-full grid-cols-2 bg-[#F4F4F4] p-2'>
              <TabsTrigger
                className='text-muted data-[state=active]:text-[#ABDCDB]'
                value='weekly'
              >
                Weekly
              </TabsTrigger>
              <TabsTrigger
                className='text-muted data-[state=active]:text-[#ABDCDB]'
                value='monthly'
              >
                Monthly
              </TabsTrigger>
            </TabsList>
            <TabsContent value='weekly'>
              <Column height={180} {...configColumn} {...dataWeekly} />
            </TabsContent>
            <TabsContent value='monthly'>
              <Column height={180} {...configColumn} {...dataMonthly} />
            </TabsContent>
          </Tabs>
          <div className='text-[10px]'>
            *based on your data previous record, not necessarily in recent
            period
          </div>
        </div>
      </div>

      <div className='flex gap-4 p-4'>
        <Link href={'/exercise'} className='card flex w-full'>
          <Image
            src={'/images/mental-health.svg'}
            width={40}
            height={40}
            alt='writing'
          />
          <div className='ml-2 flex flex-col'>
            <span className='text-[12px] font-bold text-primary'>
              Relax Time
            </span>
            <span className='text-[10px] text-primary'>
              Relax for Better Mental Health
            </span>
          </div>
        </Link>
        <Link href={'/'} className='card flex w-full'>
          <Image
            src={'/images/writing.svg'}
            width={40}
            height={40}
            alt='writing'
          />
          <div className='ml-2 flex flex-col'>
            <span className='text-[12px] font-bold text-primary'>
              SOAP Report
            </span>
            <span className='text-[10px] text-primary'>Start Writting</span>
          </div>
        </Link>
      </div>

      <div className='p-4'>
        <div className='mb-4 text-[14px] font-bold text-muted'>
          Browse Instruments
        </div>
        <div className='grid w-full grid-cols-2 gap-4'>
          {Array(4)
            .fill(undefined)
            .map((_, index: number) => (
              <Link
                key={index}
                href={'/'}
                className='card flex w-full items-center p-2'
              >
                <div className='mr-2 h-[40px] w-[40px] rounded-full bg-[#F8F8F8] p-2'>
                  <div className='max-w[24px]'>
                    <Image
                      className='min-h-[24px] min-w-[24px] object-cover'
                      src='/images/note.svg'
                      width={24}
                      height={24}
                      alt='note'
                    />
                  </div>
                </div>
                <div className='text-[12px]'>BIG 5 Personality Test lanjut</div>
              </Link>
            ))}
        </div>
      </div>

      <div className='p-4'>
        <Community />
      </div>
    </div>
  )
}
