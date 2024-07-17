import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns'
import Image from 'next/image'
import { useState } from 'react'
const CONTENT_DEFAULT = 0
const CONTENT_CUSTOM = 1

const filterContentListDate = [
  {
    label: 'Today',
    value: {
      start: new Date(),
      end: new Date()
    }
  },
  {
    label: 'This Week',
    value: {
      start: addDays(startOfWeek(new Date()), 1),
      end: addDays(endOfWeek(new Date()), 1)
    }
  },
  {
    label: 'Next Week',
    value: {
      start: addDays(startOfWeek(new Date()), 8),
      end: addDays(endOfWeek(new Date()), 8)
    }
  }
]

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
  const [isUseCustomDate, setIsUseCustomDate] = useState<boolean>(false)
  const [filter, setFilter] = useState({
    startDate: undefined,
    endDate: undefined,
    startTime: '',
    endTime: '',
    type: ''
  })

  function handleFilterChange(label: any, value: any) {
    setFilter(prevState => ({
      ...prevState,
      [label]: value
    }))
  }

  const renderDrawerContent = () => {
    switch (whichContent) {
      case CONTENT_DEFAULT:
        return (
          <div className='flex flex-col'>
            <div className='mx-auto text-[20px] font-bold'>Filter & Sort</div>
            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>Data</div>
              <div className='flex flex-wrap gap-[10px]'>
                {filterContentListDate.map(date => (
                  <div
                    key={date.label}
                    onClick={() => {
                      handleFilterChange('startDate', date.value.start)
                      handleFilterChange('endDate', date.value.end)
                      setIsUseCustomDate(false)
                    }}
                    className={cn(
                      'card min-w-[34px] border-0 p-4 text-[12px]',
                      filter.startDate === date.value.start &&
                        filter.endDate === date.value.end
                        ? 'bg-secondary font-bold text-white'
                        : 'bg-white'
                    )}
                  >
                    {date.label}
                  </div>
                ))}
                <div
                  onClick={() => setWhichContent(CONTENT_CUSTOM)}
                  className={cn(
                    'card min-w-[34px] border-0 p-4 text-[12px]',
                    isUseCustomDate
                      ? 'bg-secondary font-bold text-white'
                      : 'bg-white'
                  )}
                >
                  Custom{' '}
                  {isUseCustomDate &&
                    `: ${format(filter.startDate, 'dd/MM/yy')} - ${format(filter.endDate, 'dd/MM/yy')}`}
                </div>
              </div>
            </div>
            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>Session Time</div>
              <div className='flex flex-wrap gap-[10px]'>
                {filterContentListTime.map(time => (
                  <div
                    key={time.label}
                    onClick={() => {
                      handleFilterChange('startTime', time.value.start)
                      handleFilterChange('endTime', time.value.end)
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
                    handleFilterChange('type', 'online')
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
                    handleFilterChange('type', 'offline')
                  }}
                >
                  Offline
                </div>
              </div>
            </div>
            <Button className='mt-4 rounded-xl bg-secondary text-white'>
              Terapkan Filter
            </Button>
          </div>
        )
      case CONTENT_CUSTOM:
        return (
          <div className='flex flex-col'>
            <div className='mx-auto text-[20px] font-bold'>Filter & Sort</div>
            <div className='mt-4 flex w-full justify-center'>
              <Calendar
                mode='range'
                selected={{
                  from: filter.startDate,
                  to: filter.endDate
                }}
                onSelect={({ from, to }) => {
                  handleFilterChange('startDate', from)
                  handleFilterChange('endDate', to)
                  setIsUseCustomDate(true)
                }}
                className='w-min'
                classNames={{
                  day_selected:
                    ' bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground'
                }}
              />
            </div>
            <Button
              type='button'
              onClick={() => setWhichContent(CONTENT_DEFAULT)}
              className='mt-4 rounded-xl bg-secondary text-white'
            >
              Kembali
            </Button>
          </div>
        )

      default:
        break
    }
  }
  return (
    <Drawer onClose={() => setWhichContent(CONTENT_DEFAULT)}>
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
