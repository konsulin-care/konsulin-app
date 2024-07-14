import Input from '@/components/general/input'
import { addDays, format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import styles from './dob-calendar.module.css'

export default function DobCalendar({ value, onChange }) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState(value)

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar)
  }

  const handleDateChange = (date: any) => {
    onChange(date)
    setSelectedDate(date)
    setShowCalendar(false)
  }

  const tileDisabled = ({ date, view }) => {
    if (view === 'month') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = addDays(today, 1)
      return date >= tomorrow
    }
  }

  const getTileClassName = ({ date, view }) => {
    const classes = [styles['custom-tile']]
    if (view === 'month') {
      if (date.toDateString() === new Date().toDateString()) {
        classes.push(styles['custom-today'])
      }
      if (tileDisabled({ date, view })) {
        classes.push(styles['custom-disabled'])
      }
      if (date.toDateString() === selectedDate?.toDateString()) {
        classes.push(styles['custom-selected'])
      }
    }
    return classes.join(' ')
  }

  return (
    <>
      <Input
        width={24}
        height={24}
        prefixIcon={'/icons/calendar-edit.png'}
        placeholder='Masukan Tanggal lahir'
        name='birthdate'
        id='birthdate'
        outline={false}
        type='text'
        opacity={false}
        value={
          selectedDate
            ? format(selectedDate, 'dd MMMM yyyy', { locale: id })
            : ''
        }
        onChange={event => onChange(event.target.value)}
        onFocus={toggleCalendar}
        className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
      />
      {showCalendar && (
        <div className='p-4'>
          <Calendar
            onChange={value => handleDateChange(value)}
            value={selectedDate}
            prev2Label={null}
            next2Label={null}
            tileDisabled={tileDisabled}
            className={`${styles['custom-calendar']}`}
            tileClassName={getTileClassName}
          />
        </div>
      )}
    </>
  )
}
