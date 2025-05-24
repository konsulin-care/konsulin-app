import { IPractitionerRoleDetail } from '@/types/practitioner';
import { DayOfWeek, FormsState, TimeRange } from '../types';

export function validateAll(
  day: string,
  formsState: FormsState,
  setErrorMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
  const allTimes = formsState[day].flatMap(form => form.times);
  const errorMessage = validateTimeRanges(allTimes);
  setErrorMessages(prev => ({ ...prev, [day]: errorMessage }));
}

export function handleOrganizationChange(
  formsState: FormsState,
  day: string,
  formIndex: number,
  timeIndex: number,
  value: { code: string; name: string; roleId?: string },
  setFormsState: React.Dispatch<React.SetStateAction<FormsState>>,
  setErrorMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
  const newFormsState = { ...formsState };
  const targetTime = newFormsState[day][formIndex].times[timeIndex];
  targetTime.code = value.code;
  targetTime.name = value.name;
  targetTime.roleId = value.roleId;

  setFormsState(newFormsState);
  validateAll(day, newFormsState, setErrorMessages);
}

export function handleRemoveTimeRange(
  day: string,
  formIndex: number,
  timeIndex: number,
  formsState: FormsState,
  setFormsState: React.Dispatch<React.SetStateAction<FormsState>>,
  setErrorMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
  const newFormsState = { ...formsState };
  newFormsState[day][formIndex].times = newFormsState[day][
    formIndex
  ].times.filter((_, i) => i !== timeIndex);
  setFormsState(newFormsState);
  validateAll(day, newFormsState, setErrorMessages);
}

export function handleAddForm(
  day: string,
  formsState: FormsState,
  setFormsState: React.Dispatch<React.SetStateAction<FormsState>>,
  setErrorMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
  const newFormsState = { ...formsState };
  newFormsState[day].push({
    times: [
      { roleId: '', code: '', name: '', fromTime: '--:--', toTime: '--:--' }
    ]
  });
  setFormsState(prevState => ({ ...prevState, ...newFormsState }));
  validateAll(day, newFormsState, setErrorMessages);
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
  const newFormsState = { ...formsState };
  newFormsState[day][formIndex].times[timeIndex][`${type}Time`] = value;
  setFormsState(newFormsState);
  validateAll(day, newFormsState, setErrorMessages);
}

export function validateTimeRanges(times: TimeRange[]) {
  let messages: string[] = [];

  const sortedTimes = times
    .map((time, index) => ({ ...time, index }))
    .sort((a, b) => {
      const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      return timeToMinutes(a.fromTime) - timeToMinutes(b.fromTime);
    });

  let hasInvalidOrder = false;
  let hasOverlap = false;

  for (let i = 0; i < sortedTimes.length; i++) {
    const current = sortedTimes[i];
    if (current.fromTime >= current.toTime) {
      hasInvalidOrder = true;
    }

    for (let j = i + 1; j < sortedTimes.length; j++) {
      const next = sortedTimes[j];
      if (current.fromTime < next.toTime && current.toTime > next.fromTime) {
        hasOverlap = true;
      }
    }
  }

  if (hasInvalidOrder) {
    messages.push('Jam tidak boleh kurang atau sama dari jadwal klinik lain.');
  }

  if (hasOverlap) {
    messages.push(
      'Waktu kamu sama dengan klinik lain, silahkan sesuaikan kembali.'
    );
  }
  return messages.join('\n');
}

// export function formatTime(time: string) {
//   if (time && typeof time === 'string') {
//     const parts = time.split(':');
//     const hours = parts[0] || '00';
//     const minutes = parts[1] || '00';
//     const seconds = parts[2] || '00';
//     return `${hours}:${minutes}:${seconds}`;
//   }
//   return time;
// }

export function handlePayloadSend(
  practitionerRolesData: IPractitionerRoleDetail[],
  formsState: FormsState
) {
  const dayMapping = {
    Monday: 'mon',
    Tuesday: 'tue',
    Wednesday: 'wed',
    Thursday: 'thu',
    Friday: 'fri',
    Saturday: 'sat',
    Sunday: 'sun'
  };

  /* convert time to full format (e.g., "08:00" => "08:00:00")
   * returns null if time is empty or invalid */
  const toFullTime = (time: string): string | null => {
    if (!time || time === '--:--') return null;
    return time.length === 5 ? `${time}:00` : time;
  };

  return practitionerRolesData
    .map(role => {
      const timeGroups: Record<
        string,
        {
          availableStartTime: string;
          availableEndTime: string;
          daysOfWeek: DayOfWeek[];
        }
      > = {};

      let roleHasData = false;

      for (const [day, forms] of Object.entries(formsState)) {
        // convert to FHIR day format (e.g., "mon")
        const mappedDay = dayMapping[day];

        forms.forEach(form => {
          form.times.forEach(time => {
            /* only include this time entry if:
             * - it belongs to the current role
             * - it has valid fromTime and toTime (not "--:--") */
            if (
              time.roleId === role.id &&
              time.fromTime !== '--:--' &&
              time.toTime !== '--:--'
            ) {
              roleHasData = true;

              /* group time ranges by "from-to" key to consolidate identical time blocks */
              const timeKey = `${toFullTime(time.fromTime)}-${toFullTime(time.toTime)}`;

              /* if this time range hasn't been recorded yet, create a new group for it.
               * the key is "from-to" (e.g., "09:00:00-12:00:00") to group identical time blocks. */
              if (!timeGroups[timeKey]) {
                timeGroups[timeKey] = {
                  availableStartTime: `${toFullTime(time.fromTime)}`,
                  availableEndTime: `${toFullTime(time.toTime)}`,
                  daysOfWeek: []
                };
              }

              /* add the current day to the list of active days for this time block,
               * if it's not already included (avoid duplicates). */
              if (!timeGroups[timeKey].daysOfWeek.includes(mappedDay)) {
                timeGroups[timeKey].daysOfWeek.push(mappedDay);
              }
            }
          });
        });
      }

      if (!roleHasData) return null;

      return {
        ...role,
        availableTime: Object.values(timeGroups)
      };
    })
    .filter(role => role !== null);
}
