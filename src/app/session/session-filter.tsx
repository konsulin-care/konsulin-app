import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import Image from 'next/image'
import { useState } from 'react'

const CONTENT_DEFAULT = 0
const CONTENT_CUSTOM = 1

const filterContentListDate = [
  {
    label: 'Today',
    value: {
      start: dayjs().format('DDMMYYYY'),
      end: dayjs().format('DDMMYYYY')
    }
  },
  {
    label: 'This Week',
    value: {
      start: dayjs().startOf('week').add(1, 'day').format('DDMMYYYY'),
      end: dayjs().endOf('week').add(1, 'day').format('DDMMYYYY')
    }
  },
  {
    label: 'Next Week',
    value: {
      start: dayjs().startOf('week').add(8, 'day').format('DDMMYYYY'),
      end: dayjs().endOf('week').add(8, 'day').format('DDMMYYYY')
    }
  },
  {
    label: 'Custom',
    value: {
      start: null,
      end: null
    }
  }
]

console.log({ filterContentListDate })

const filterContentListTime = [
  {
    label: '07:00 - 10:00',
    value: {
      start: '07:00',
      end: '10:00'
    }
  },
  {
    label: '10:00 - 13:00',
    value: {
      start: '10:00',
      end: '13:00'
    }
  },
  {
    label: '13:00 - 16:00',
    value: {
      start: '13:00',
      end: '16:00'
    }
  },
  {
    label: '16:00 - 18:00',
    value: {
      start: '16:00',
      end: '18:00'
    }
  },
  {
    label: '18:00 - 22:00',
    value: {
      start: '18:00',
      end: '22:00'
    }
  }
]

export default function SessionFilter() {
  const [whichContent, setWhichContent] = useState<
    typeof CONTENT_DEFAULT | typeof CONTENT_CUSTOM
  >(CONTENT_DEFAULT)

  const [filter, setFilter] = useState({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    type: ''
  })

  function handleChangeInput(label: any, value: any) {
    setFilter(prevState => ({
      ...prevState,
      [label]: value
    }))
  }

  const renderDrawerContent = () => {
    switch (whichContent) {
      case CONTENT_DEFAULT:
        return (
          <>
            <div className='mx-auto text-[20px] font-bold'>Filter & Sort</div>
            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>Data</div>
              <div className='flex flex-wrap gap-2'>
                {filterContentListDate.map(date => (
                  <div
                    key={date.label}
                    onClick={() => {
                      handleChangeInput('startDate', date.value.start)
                      handleChangeInput('endDate', date.value.end)
                    }}
                    className={cn(
                      'card border-0 p-4 text-[12px]',
                      filter.startDate === date.value.start &&
                        filter.endDate === date.value.end
                        ? 'bg-secondary font-bold text-white'
                        : 'bg-white'
                    )}
                  >
                    {date.label}
                  </div>
                ))}
              </div>
            </div>
            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='font-bold'>Session Time</div>
              <div className='flex flex-wrap gap-2'>
                {filterContentListTime.map(time => (
                  <div
                    key={time.label}
                    onClick={() => {
                      handleChangeInput('startTime', time.value.start)
                      handleChangeInput('endTime', time.value.end)
                    }}
                    className={cn(
                      'card border-0 p-4 text-[12px]',
                      filter.startTime === time.value.start &&
                        filter.endTime === time.value.end
                        ? 'bg-secondary font-bold text-white'
                        : 'bg-white'
                    )}
                  >
                    {time.label}
                  </div>
                ))}
              </div>
            </div>
            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>Session Type</div>
              <div className='flex flex-wrap gap-2'>
                <div
                  className={cn(
                    'card border-0 p-4 text-[12px]',
                    filter.type === 'online'
                      ? 'bg-secondary font-bold text-white'
                      : 'bg-white'
                  )}
                  onClick={() => {
                    handleChangeInput('type', 'online')
                  }}
                >
                  Online
                </div>
                <div
                  className={cn(
                    'card border-0 p-4 text-[12px]',
                    filter.type === 'offline'
                      ? 'bg-secondary font-bold text-white'
                      : 'bg-white'
                  )}
                  onClick={() => {
                    handleChangeInput('type', 'offline')
                  }}
                >
                  Offline
                </div>
              </div>
            </div>
          </>
        )
      case CONTENT_CUSTOM:
        break

      default:
        break
    }
  }
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant='outline'
          className='flex h-[50px] w-[50px] items-center justify-center rounded-lg border-0 bg-[#F9F9F9]'
        >
          <Image
            alt='filter min-w-[20px] min-h-[20px] object-cover'
            width={20}
            height={20}
            src={'/icons/filter.svg'}
          />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
        <div className='mt-4'>{renderDrawerContent()}</div>
      </DrawerContent>
    </Drawer>
  )
}
