import { addDays } from 'date-fns'
import { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import styles from './dob-calendar.module.css'

export default function DobCalendar({ value, onChange }) {
  const [selectedDate, setSelectedDate] = useState(value)

  const handleDateChange = (date: any) => {
    onChange(date)
    setSelectedDate(date)
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
  )
}
