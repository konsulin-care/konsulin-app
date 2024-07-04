'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import { ChevronRightIcon } from 'lucide-react'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'

const Pie = dynamic(
  () => import('@ant-design/plots').then(mod => mod.Pie) as any,
  { ssr: false }
)
const Column = dynamic(
  () => import('@ant-design/plots').then(mod => mod.Column) as any,
  { ssr: false }
)

const App: React.FC<IWithAuth> = ({ userRole, isAuthenticated }) => {
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

  const renderHomeContent = () => {
    switch (userRole) {
      case 'patient':
        return (
          <div className='mt-[-24px] rounded-[16px] bg-white'>
            <div className='p-4'>
              <div className='rounded-lg bg-[#F9F9F9] p-[16px]'>
                <div className='text-[14px] font-bold text-[#2C2F3599]'>
                  What’s the turbulence on your mind?
                </div>
                <div className=''>
                  <Pie height={180} {...configPie} />
                </div>
                <div className='text-[10px]'>
                  *based on your data previous record, not necessarily in recent
                  period
                </div>
              </div>
            </div>

            <div className='flex gap-4 p-4'>
              <Link href={'/'} className='card flex w-full'>
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
                    Start Writting
                  </span>
                  <span className='text-[10px] text-primary'>
                    Express your current feelings
                  </span>
                </div>
              </Link>
            </div>

            {/* Popular Assesment */}
            <div className='bg-[#F9F9F9] p-4'>
              <div className='flex justify-between text-muted'>
                <span className='mb-2 text-[14px] font-bold'>
                  Popular Assesment
                </span>
                <Link className='text-[12px]' href={'/'}>
                  See All
                </Link>
              </div>
              <div>
                <ScrollArea className='w-full whitespace-nowrap pb-4'>
                  <div className='flex w-max space-x-4'>
                    {Array(5)
                      .fill(undefined)
                      .map((_, index: number) => (
                        <Link
                          key={index}
                          href={'/'}
                          className='card flex w-fit shrink-0 items-center gap-2 bg-white'
                        >
                          <Image
                            width={40}
                            height={40}
                            alt='excerise'
                            src={'/images/exercise.svg'}
                          />
                          <div className='flex flex-col'>
                            <span className='text-[12px] font-bold'>
                              BIG 5 Personality Test
                            </span>
                            <span className='text-[10px] text-muted'>
                              Know yourself in 5 aspects of traits
                            </span>
                          </div>
                          <ChevronRightIcon className='text-muted' />
                        </Link>
                      ))}
                  </div>
                  <ScrollBar orientation='horizontal' />
                </ScrollArea>
              </div>
            </div>

            {/* Record Summary */}
            <div className='p-4'>
              <div className='flex justify-between text-muted'>
                <span className='mb-2 text-[14px] font-bold'>
                  Previous Record Summary
                </span>
                <Link className='text-[12px]' href={'/'}>
                  See All
                </Link>
              </div>
              <Link href={'/'} className='card mt-4 flex flex-col gap-2 p-4'>
                <div className='flex'>
                  <div className='mr-2 h-[40px] w-[40px] rounded-full bg-[#F8F8F8] p-2'>
                    <Image
                      className='h-[24px] w-[24px] object-cover'
                      src={'/images/note.svg'}
                      width={24}
                      height={24}
                      alt='note'
                    />
                  </div>
                  <div className='flex flex-col'>
                    <div className='text-[12px] font-bold'>
                      Tingkatkan Rasa Tenangmu
                    </div>
                    <div className='text-[10px]'>
                      Hasil pemeriksaan menunjukkan kondisi kesejahteraan mental
                      Anda dan memberikan arahan untuk perawatan lebih lanjut
                    </div>
                  </div>
                </div>
                <hr className='w-full' />
                <div className='flex items-center'>
                  <Image
                    className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
                    width={32}
                    height={32}
                    alt='offline'
                    src={'/images/avatar.jpg'}
                  />

                  <div className='mr-auto text-[12px]'>Dr.Fitra Gunawan</div>
                  <div className='text-[10px]'>12/12/2025</div>
                </div>
              </Link>
            </div>

            <div className='p-4'>
              <Link href={'/comunity'} className='card flex'>
                <Image
                  src={'/images/mental-health.svg'}
                  width={40}
                  height={40}
                  alt='writing'
                />
                <div className='ml-2 flex flex-col'>
                  <span className='text-[12px] font-bold text-primary'>
                    Community
                  </span>
                  <span className='text-[10px] text-primary'>
                    Meet with new friend in community
                  </span>
                </div>
              </Link>
            </div>
          </div>
        )
      case 'clinician':
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
              <Link href={'/'} className='card flex w-full'>
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
                  <span className='text-[10px] text-primary'>
                    Start Writting
                  </span>
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
                      <div className='text-[12px]'>
                        BIG 5 Personality Test lanjut
                      </div>
                    </Link>
                  ))}
              </div>
            </div>

            <div className='p-4'>
              <Link href={'/comunity'} className='card flex'>
                <Image
                  src={'/images/mental-health.svg'}
                  width={40}
                  height={40}
                  alt='writing'
                />
                <div className='ml-2 flex flex-col'>
                  <span className='text-[12px] font-bold text-primary'>
                    Community
                  </span>
                  <span className='text-[10px] text-primary'>
                    Meet with new friend in community
                  </span>
                </div>
              </Link>
            </div>
          </div>
        )
      default: // guest
        return (
          <div className='p-4'>
            <p className='text-center'>
              Welcome, guest! You have limited access to the dashboard.
            </p>
          </div>
        )
    }
  }

  return (
    <div className='flex min-h-screen flex-col'>
      {!isAuthenticated ? (
        <div className='p-4'>
          <Link href='/login'>
            <Button className='w-full bg-secondary text-white'>Login</Button>
          </Link>
          {renderHomeContent()}
        </div>
      ) : (
        <>
          <NavigationBar>
            <Header>
              <div className='flex'>
                <Image
                  className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
                  width={32}
                  height={32}
                  alt='offline'
                  src={'/images/avatar.jpg'}
                />
                <div className='flex flex-col'>
                  <div className='text-[10px] font-normal text-white'>
                    Selamat Datang di Dashboard anda
                  </div>
                  <div className='text-[14px] font-bold text-white'>
                    Aji Si {userRole}
                  </div>
                </div>
              </div>
            </Header>
            {renderHomeContent()}
          </NavigationBar>
        </>
      )}
    </div>
  )
}

export default withAuth(App, ['patient', 'clinician'], true)
