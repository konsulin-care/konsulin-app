import { FilterIcon } from '@/components/icons'
import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns'
import { useState } from 'react'
const CONTENT_DEFAULT = 0
const CONTENT_CUSTOM = 1

const today = new Date()

const filterContentListDate = [
  {
    label: 'Today',
    value: {
      start: today,
      end: today
    }
  },
  {
    label: 'This Week',
    value: {
      start: addDays(startOfWeek(today), 1),
      end: addDays(endOfWeek(today), 1)
    }
  },
  {
    label: 'Next Week',
    value: {
      start: addDays(startOfWeek(today), 8),
      end: addDays(endOfWeek(today), 8)
    }
  }
]

export type IRecordParams = {
  page?: number
  pageSize?: number
  name?: string
  start_date?: Date
  end_date?: Date
  type?: string
}

export default function ClinicFilter({ onChange }) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [whichContent, setWhichContent] = useState<
    typeof CONTENT_DEFAULT | typeof CONTENT_CUSTOM
  >(CONTENT_DEFAULT)
  const [isUseCustomDate, setIsUseCustomDate] = useState<boolean>(false)
  const [filter, setFilter] = useState<IRecordParams>({
    start_date: undefined,
    end_date: undefined,
    type: undefined
  })

  const isInitiaFilterState = !filter.start_date && !filter.end_date

  const handleCustomFilterOpen = () => {
    if (isInitiaFilterState) {
      handleFilterChange('start_date', today)
      handleFilterChange('end_date', addDays(today, 7))
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
      start_date: undefined,
      end_date: undefined,
      type: undefined
    })
  }

  const renderDrawerContent = () => {
    switch (whichContent) {
      case CONTENT_DEFAULT:
        return (
          <div className='flex flex-col'>
            <div className='mx-auto text-[20px] font-bold'>Filter & Sort</div>
            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>Date</div>
              <div className='flex flex-wrap gap-[10px]'>
                {filterContentListDate.map(date => (
                  <Button
                    key={date.label}
                    onClick={() => {
                      handleFilterChange('start_date', date.value.start)
                      handleFilterChange('end_date', date.value.end)
                      setIsUseCustomDate(false)
                    }}
                    variant='outline'
                    className={cn(
                      'h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px]',
                      filter.start_date === date.value.start &&
                        filter.end_date === date.value.end
                        ? 'bg-secondary font-bold text-white hover:bg-secondary'
                        : 'bg-white font-normal'
                    )}
                  >
                    {date.label}
                  </Button>
                ))}
                <Button
                  variant='outline'
                  onClick={handleCustomFilterOpen}
                  className={cn(
                    'h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px]',
                    isUseCustomDate
                      ? 'bg-secondary font-bold text-white hover:bg-secondary'
                      : 'bg-white font-normal'
                  )}
                >
                  Custom
                  {!isUseCustomDate || !filter.start_date || !filter.end_date
                    ? ''
                    : filter.start_date === filter.end_date
                      ? ` : ${format(filter.start_date, 'dd MMM yy')}`
                      : ` : ${format(filter.start_date, 'dd MMM yy')} - ${format(filter.end_date, 'dd MMM yy')}`}
                </Button>
              </div>
            </div>

            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>Show By</div>
              <div className='flex flex-wrap gap-[10px]'>
                <Select onValueChange={e => handleFilterChange('type', e)}>
                  <SelectTrigger className='w-full border-none'>
                    <SelectValue placeholder='All' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='All'>All</SelectItem>
                    <SelectItem value='Jurnal'>Jurnal</SelectItem>
                    <SelectItem value='Assessment'>Assessment</SelectItem>
                    <SelectItem value='SOAP'>SOAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!isInitiaFilterState && (
              <Button
                variant='outline'
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
              className='mt-4 rounded-xl bg-secondary p-4 text-white'
              onClick={() => {
                setIsOpen(false)
                onChange(filter)
              }}
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
                  from: filter.start_date,
                  to: filter.end_date
                }}
                onSelect={date => {
                  handleFilterChange('start_date', date?.from)
                  handleFilterChange(
                    'end_date',
                    date?.to ? date.to : date?.from
                  )
                  setIsUseCustomDate(true)
                }}
                disabled={{ before: today }}
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
      modal={isOpen}
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
            fill='#13c2c2'
          />
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className='mx-auto max-w-screen-sm p-4'
        onInteractOutside={() => setIsOpen(false)}
      >
        <div className='mt-4'>{renderDrawerContent()}</div>
      </DrawerContent>
    </Drawer>
  )
}
