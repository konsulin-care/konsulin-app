import { FormsState, TimeRange } from '../types'

export function groupByFirmAndDay(formsState: FormsState): any {
  const grouped = {}

  Object.keys(formsState).forEach(day => {
    formsState[day].forEach(form => {
      form.times.forEach(time => {
        if (!time.firm || time.fromTime === '--:--' || time.toTime === '--:--')
          return

        if (!grouped[time.firm]) {
          grouped[time.firm] = {}
        }
        if (!grouped[time.firm][day]) {
          grouped[time.firm][day] = []
        }
        grouped[time.firm][day].push({
          fromTime: time.fromTime,
          toTime: time.toTime
        })
      })
    })
  })

  return grouped
}

export function validateAll(
  day: string,
  formsState: FormsState,
  setErrorMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
  const allTimes = formsState[day].flatMap(form => form.times)
  const errorMessage = validateTimeRanges(allTimes)
  setErrorMessages(prev => ({ ...prev, [day]: errorMessage }))
}

export function handleCompanyChange(
  formsState: FormsState,
  day: string,
  formIndex: number,
  timeIndex: number,
  value: string,
  setFormsState: React.Dispatch<React.SetStateAction<FormsState>>,
  setErrorMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
  const newFormsState = { ...formsState }
  newFormsState[day][formIndex].times[timeIndex].firm = value
  setFormsState(newFormsState)
  validateAll(day, newFormsState, setErrorMessages)
}

export function handleRemoveTimeRange(
  day: string,
  formIndex: number,
  timeIndex: number,
  formsState: FormsState,
  setFormsState: React.Dispatch<React.SetStateAction<FormsState>>,
  setErrorMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
  const newFormsState = { ...formsState }
  newFormsState[day][formIndex].times = newFormsState[day][
    formIndex
  ].times.filter((_, i) => i !== timeIndex)
  setFormsState(newFormsState)
  validateAll(day, newFormsState, setErrorMessages)
}

export function handleAddForm(
  day: string,
  formsState: FormsState,
  setFormsState: React.Dispatch<React.SetStateAction<FormsState>>,
  setErrorMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
  const newFormsState = { ...formsState }
  newFormsState[day].push({
    times: [{ firm: '', fromTime: '--:--', toTime: '--:--' }]
  })
  setFormsState(newFormsState)
  validateAll(day, newFormsState, setErrorMessages)
}

export function handleTimeChange(
  day: string,
  formIndex: number,
  timeIndex: number,
  type: 'from' | 'to',
  value: string,
  formsState: FormsState,
  setFormsState: React.Dispatch<React.SetStateAction<FormsState>>,
  setErrorMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
  const newFormsState = { ...formsState }
  newFormsState[day][formIndex].times[timeIndex][`${type}Time`] = value
  setFormsState(newFormsState)
  validateAll(day, newFormsState, setErrorMessages)
}

export function validateTimeRanges(times: TimeRange[]) {
  let errorMessages = ''

  const sortedTimes = times
    .map((time, index) => ({ ...time, index }))
    .sort((a, b) => {
      const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number)
        return hours * 60 + minutes
      }
      return timeToMinutes(a.fromTime) - timeToMinutes(b.fromTime)
    })

  for (let i = 0; i < sortedTimes.length; i++) {
    const current = sortedTimes[i]
    if (current.fromTime >= current.toTime) {
      errorMessages += `Jam tidak boleh kurang atau sama dari jadwal klinik lain`
    }

    for (let j = i + 1; j < sortedTimes.length; j++) {
      const next = sortedTimes[j]
      if (current.fromTime < next.toTime && current.toTime >= next.fromTime) {
        errorMessages += `Waktu kamu sama dengan klinik lain, silahkan sesuaikan kembali`
      }
    }
  }

  return errorMessages
}
