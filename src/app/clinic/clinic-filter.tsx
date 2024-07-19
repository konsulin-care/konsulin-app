import { FilterIcon } from '@/components/icons'
import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns'
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

export default function ClinicFilter() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [whichContent, setWhichContent] = useState<
    typeof CONTENT_DEFAULT | typeof CONTENT_CUSTOM
  >(CONTENT_DEFAULT)
  const [isUseCustomDate, setIsUseCustomDate] = useState<boolean>(false)
  const [filter, setFilter] = useState({
    startDate: undefined,
    endDate: undefined,
    startTime: undefined,
    endTime: undefined,
    type: 'all'
  })

  const isInitiaFilterState =
    !filter.startDate && !filter.endDate && !filter.startTime && !filter.endTime

  const handleCustomFilterOpen = () => {
    if (isInitiaFilterState) {
      handleFilterChange('startTime', '00:00')
      handleFilterChange('endTime', '23:59')
      handleFilterChange('startDate', new Date())
      handleFilterChange('endDate', addDays(new Date(), 7))
      setIsUseCustomDate(true)
    }

    setWhichContent(CONTENT_CUSTOM)
  }

  const handleFilterChange = (label: string, value: any) => {
    setFilter(prevState => ({
      ...prevState,
      [label]: value
    }))
  }

  const resetFilter = () => {
    setFilter({
      startDate: undefined,
      endDate: undefined,
      startTime: undefined,
      endTime: undefined,
      type: 'all'
    })
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
                  onClick={handleCustomFilterOpen}
                  className={cn(
                    'card min-w-[34px] border-0 p-4 text-[12px]',
                    isUseCustomDate
                      ? 'bg-secondary font-bold text-white'
                      : 'bg-white'
                  )}
                >
                  Custom
                  {isUseCustomDate &&
                    (filter.startDate === filter.endDate
                      ? ''
                      : ` : ${format(filter.startDate, 'dd MMM yy')} - ${format(filter.endDate, 'dd MMM yy')}`)}
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
                {isUseCustomDate && filter.startTime && filter.endTime && (
                  <div
                    onClick={() => {
                      setWhichContent(CONTENT_CUSTOM)
                      handleFilterChange('startTime', '00:00')
                      handleFilterChange('endTime', '23:59')
                      handleFilterChange('startDate', new Date())
                      handleFilterChange('endDate', addDays(new Date(), 7))
                      setIsUseCustomDate(true)
                    }}
                    className={cn(
                      'card min-w-[34px] border-0 p-4 text-[12px]',
                      isUseCustomDate
                        ? 'bg-secondary font-bold text-white'
                        : 'bg-white'
                    )}
                  >
                    Custom : {`${filter.startTime} - ${filter.endTime}`}
                  </div>
                )}
              </div>
            </div>
            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>Session Type</div>
              <div className='flex flex-wrap gap-2'>
                <div
                  className={cn(
                    'card border-0 p-4 text-[12px]',
                    filter.type === 'all'
                      ? 'bg-secondary font-bold text-white'
                      : 'bg-white'
                  )}
                  onClick={() => {
                    handleFilterChange('type', 'all')
                  }}
                >
                  All
                </div>
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
            {!isInitiaFilterState && (
              <Button
                size='sm'
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'mt-4 w-min border-0 text-[12px]'
                )}
                onClick={resetFilter}
              >
                Reset Filter
              </Button>
            )}

            <Button
              className='mt-4 rounded-xl bg-secondary text-white'
              onClick={() => setIsOpen(false)}
            >
              Terapkan Filter
            </Button>
          </div>
        )
      case CONTENT_CUSTOM:
        return (
          <div className='flex flex-col'>
            <div className='mx-auto text-[20px] font-bold'>Filter & Sort</div>
            <div className='mt-4 flex w-full flex-col justify-center'>
              <Calendar
                mode='range'
                selected={{
                  from: filter.startDate,
                  to: filter.endDate
                }}
                onSelect={date => {
                  handleFilterChange('startDate', date?.from)
                  handleFilterChange('endDate', date?.to ? date.to : date?.from)
                }}
                disabled={{ before: new Date() }}
                className='w-full p-0'
                classNames={{
                  month: 'space-y-8 w-full',
                  head_row: 'flex w-full',
                  head_cell:
                    'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] w-full',
                  cell: 'w-full h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                  day: cn(
                    buttonVariants({ variant: 'ghost' }),
                    'h-9 p-0 font-normal aria-selected:opacity-100 w-full'
                  ),
                  day_selected:
                    'bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground',
                  day_today: 'bg-accent text-accent-foreground font-extrabold'
                }}
              />

              <div className='mt-8 flex gap-4'>
                <div className='grid w-full max-w-sm items-center gap-1.5'>
                  <Label htmlFor='startTime'>Start Time</Label>
                  <Input
                    onChange={e =>
                      handleFilterChange('startTime', e.target.value)
                    }
                    value={filter.startTime}
                    id='startTime'
                    className='block p-4'
                    type='time'
                  />
                </div>
                <div className='grid w-full max-w-sm items-center gap-1.5'>
                  <Label htmlFor='endTime'>End Time</Label>
                  <Input
                    min={filter.startTime}
                    onChange={e =>
                      handleFilterChange('endTime', e.target.value)
                    }
                    value={filter.endTime}
                    id='endTime'
                    className='block p-4'
                    type='time'
                  />
                </div>
              </div>
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
    <Drawer
      onClose={() => {
        setWhichContent(CONTENT_DEFAULT)
        setIsOpen(false)
      }}
      open={isOpen}
    >
      <DrawerTrigger asChild>
        <Button
          onClick={() => setIsOpen(true)}
          variant='outline'
          className={cn(
            'flex h-[50px] w-[50px] items-center justify-center rounded-lg border-0 bg-[#F9F9F9]'
          )}
        >
          <FilterIcon
            width={20}
            height={20}
            className='min-h-[20px] min-w-[20px]'
            fill={isInitiaFilterState ? '#E1E1E1' : '#13c2c2'}
          />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
        <div className='mt-4'>{renderDrawerContent()}</div>
      </DrawerContent>
    </Drawer>
  )
}
