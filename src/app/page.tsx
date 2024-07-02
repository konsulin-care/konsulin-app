'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import withAuth from '@/hooks/useAuth'
import { Pie } from '@ant-design/plots'
import { ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const COLORS = [
  '#87E8DE',
  '#36CFC9',
  '#13C2C2',
  '#08979C',
  '#006D75',
  '#00474F'
]

interface HomeProps {
  userRole: string
  isAuthenticated: boolean
}

const Home: React.FC<HomeProps> = ({ userRole, isAuthenticated }) => {
  const config = {
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

  const renderHomeContent = () => {
    switch (userRole) {
      case 'guest':
        return (
          <div className='p-4'>
            <p className='text-center'>
              Welcome, guest! You have limited access to the dashboard.
            </p>
          </div>
        )
      case 'patient':
        return (
          <div className='mt-[-24px] rounded-[16px] bg-white'>
            <div className='p-4'>
              <div className='rounded-lg bg-[#F9F9F9] p-[16px]'>
                <div className='text-[14px] font-bold text-[#2C2F3599]'>
                  What’s the turbulence on your mind?
                </div>
                <div className=''>
                  <Pie height={180} {...config} />
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
              <div className='flex justify-between'>
                <span className='mb-2 text-[14px] font-bold'>
                  Popular Assesment
                </span>
                <span className='text-[12px]'>See All</span>
              </div>
              <div>
                <ScrollArea>
                  <Link
                    href={'/'}
                    className='card flex w-fit items-center gap-2 bg-white'
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
                </ScrollArea>
              </div>
            </div>

            {/* Record Summary */}
            <div className='p-4'>
              <div className='flex justify-between text-muted'>
                <span className='mb-2 text-[14px] font-bold'>
                  Previous Record Summary
                </span>
                <span className='text-[12px]'>See All</span>
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
          <div className='p-4'>
            <p className='text-center'>
              Halo clinician, ini tampilan khusus untuk clinician.
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
                    Aji Si {localStorage.getItem('userRole')}
                  </div>
                </div>
              </div>
            </Header>
            {renderHomeContent()}
          </NavigationBar>
        </>
      )}

      {/* RENDER CONTENT */}
    </div>
  )
}

export default withAuth(Home, ['patient', 'clinician'], true)
