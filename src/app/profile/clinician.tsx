'use client'

import Collapsible from '@/components/profile/collapsible'
import DropdownProfile from '@/components/profile/dropdown-profile'
import InformationDetail from '@/components/profile/information-detail'
import MedalCollection from '@/components/profile/medal-collection'
import Settings from '@/components/profile/settings'
import Tags from '@/components/profile/tags'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle
} from '@/components/ui/drawer'
import { medalLists, settingMenus } from '@/constants/profile'
import { useProfile } from '@/context/profile/profileContext'
import { apiRequest } from '@/services/api'
import {
  fetchListClinic,
  fetchProfile,
  RequestAvailableTime,
  ResponseProfile
} from '@/services/profile'
import { capitalizeFirstLetter, formatLabel } from '@/utils/validation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { daysOfWeek } from './constants'
import { FormsState } from './types'
import {
  handleAddForm,
  handleCompanyChange,
  handlePayloadSend,
  handleRemoveTimeRange,
  handleTimeChange,
  validateTimeRanges
} from './utils'

export default function Clinician() {
  const router = useRouter()
  const { state, dispatch } = useProfile()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null)
  const [formsState, setFormsState] = useState<FormsState>(
    daysOfWeek.reduce((acc, day) => {
      acc[day] = []
      return acc
    }, {} as FormsState)
  )
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({})
  const [groupedByFirmAndDay, setGroupedByFirmAndDay] = useState({})
  const queryClient = useQueryClient()

  // fetch profile
  const { data: profileResponse } = useQuery<ResponseProfile>({
    queryKey: ['profile-clinician'],
    queryFn: () => fetchProfile(state, dispatch)
  })

  const handleOpenDrawer = () => {
    const { practice_availabilities, practice_informations } = state.profile

    const initialFormsState = daysOfWeek.reduce((acc, day) => {
      acc[day] = []
      return acc
    }, {} as FormsState)

    setFormsState(initialFormsState)

    const clinicNameMapping = practice_informations.reduce(
      (acc, clinicInfo) => {
        acc[clinicInfo.clinic_id] = clinicInfo.clinic_name
        return acc
      },
      {} as Record<string, string>
    )

    const updatedFormsState = { ...initialFormsState }
    if (Array.isArray(practice_availabilities)) {
      const dayMapping = {
        mon: 'Monday',
        tue: 'Tuesday',
        wed: 'Wednesday',
        thu: 'Thursday',
        fri: 'Friday',
        sat: 'Saturday',
        sun: 'Sunday'
      }

      practice_availabilities.forEach(clinic => {
        clinic.available_time.forEach(timeSlot => {
          timeSlot.days_of_Week.forEach(shortDay => {
            const fullDayName = dayMapping[shortDay]
            if (fullDayName) {
              updatedFormsState[fullDayName].push({
                times: [
                  {
                    firm: clinicNameMapping[clinic.clinic_id] || '',
                    fromTime: timeSlot.available_start_time,
                    toTime: timeSlot.available_end_time
                  }
                ]
              })
            }
          })
        })
      })

      setFormsState(updatedFormsState)
    } else {
      console.error('practice_availabilities is not an array')
    }
    setIsDrawerOpen(true)
  }

  useEffect(() => {
    if (profileResponse && profileResponse.data) {
      const practiceAvailabilities =
        profileResponse.data.practice_availabilities
      const practiceInformations = profileResponse.data.practice_informations
      if (
        !Array.isArray(practiceAvailabilities) ||
        !Array.isArray(practiceInformations)
      ) {
        setGroupedByFirmAndDay({})
      }

      const newGroupedByFirmAndDay = {}

      const clinicNamesMap = practiceInformations.reduce((acc, clinic) => {
        acc[clinic.clinic_id] = clinic.clinic_name
        return acc
      }, {})
      if (practiceAvailabilities) {
        practiceAvailabilities.forEach(clinic => {
          const clinicId = clinic.clinic_id
          const clinicName = clinicNamesMap[clinicId]

          if (clinic.available_time && Array.isArray(clinic.available_time)) {
            clinic.available_time.forEach(timeSlot => {
              if (
                timeSlot.days_of_Week &&
                Array.isArray(timeSlot.days_of_Week)
              ) {
                timeSlot.days_of_Week.forEach(day => {
                  const dayKey = day.charAt(0).toUpperCase() + day.slice(1)

                  if (!newGroupedByFirmAndDay[clinicName]) {
                    newGroupedByFirmAndDay[clinicName] = {
                      availability: {}
                    }
                  }

                  if (
                    !newGroupedByFirmAndDay[clinicName].availability[dayKey]
                  ) {
                    newGroupedByFirmAndDay[clinicName].availability[dayKey] = []
                  }

                  newGroupedByFirmAndDay[clinicName].availability[dayKey].push({
                    fromTime: timeSlot.available_start_time,
                    toTime: timeSlot.available_end_time
                  })
                })
              }
            })
          }
        })

        setGroupedByFirmAndDay(prevState => ({
          ...prevState,
          ...newGroupedByFirmAndDay
        }))
      } else {
        setGroupedByFirmAndDay({})
      }
    }
  }, [profileResponse])

  // fetch clinician
  const { data } = useQuery({
    queryKey: ['clinician'],
    queryFn: () => fetchListClinic(),
    staleTime: 1000 * 60 * 60
  })
  const clinics = data && Array.isArray(data) ? data : []
  const firms = clinics.map(clinic => ({ name: clinic.clinic_name }))

  // handle edit schedule availability
  const { mutate } = useMutation({
    mutationFn: async (scheduleAvailable: RequestAvailableTime) => {
      try {
        const response = await apiRequest(
          'POST',
          '/api/v1/clinicians/clinics/practice-availability',
          scheduleAvailable
        )
        return response
      } catch (err) {
        throw err
      }
    },
    onSuccess: () => {
      setIsDrawerOpen(false)
      queryClient.invalidateQueries(['profile-clinician'])
    }
  })

  const handleSave = () => {
    if (activeDayIndex === null) return

    const day = daysOfWeek[activeDayIndex]
    const allTimes = formsState[day].flatMap(form => form.times)

    const hasEmptyFirm = allTimes.some(
      time => time.firm === '' || time.firm === null
    )

    const errorMessage = validateTimeRanges(allTimes)
    if (hasEmptyFirm) {
      setErrorMessages(prev => ({
        ...prev,
        [day]: 'Harap isi form dengan benar'
      }))
      return
    }

    if (errorMessage) {
      setErrorMessages(prev => ({ ...prev, [day]: errorMessage }))
    } else {
      const clonedFormsState = JSON.parse(JSON.stringify(formsState))

      const payload = handlePayloadSend(clinics, clonedFormsState)
      mutate(payload as RequestAvailableTime)
    }
  }

  const profileDetail = Object.entries(state.profile)
    .map(([key, value]) => {
      const renderValue = (value: any) => {
        if (typeof value === 'object') {
          return JSON.stringify(value)
        }
        return value
      }

      let formattedValue = renderValue(value)

      if (key === 'gender' && formattedValue !== null) {
        formattedValue = capitalizeFirstLetter(
          formattedValue.replace(/[_-]/g, ' ')
        )
      }

      return formattedValue !== null
        ? { key: formatLabel(key), value: formattedValue }
        : null
    })
    .filter(item => item !== null)
    .filter(
      item =>
        item.key !== 'Practice Informations' &&
        item.key !== 'Profile Picture' &&
        item.key !== 'Practice Availabilities'
    )

  const hasData = Object.keys(groupedByFirmAndDay).length > 0

  return (
    <>
      <div className='mb-4'>
        <InformationDetail
          isRadiusIcon
          iconUrl={state.profile.profile_picture || '/images/sample-foto.svg'}
          title='General Information'
          subTitle={state.profile.fullname}
          buttonText='Edit Profile'
          details={profileDetail}
          onEdit={() => router.push('profile/edit-profile')}
          role='clinician'
        />
      </div>
      <div className='my-4' />
      <InformationDetail
        isRadiusIcon={false}
        iconUrl='/icons/hospital.svg'
        title='Practice Information'
        buttonText='Edit Detail'
        details={state.profile.practice_informations ?? null}
        onEdit={() => router.push('profile/edit-pratice')}
        role='clinician'
        isEditPratice={true}
      />

      <div
        className={`mt-4 flex flex-col items-start justify-start rounded-[16px] bg-[#F0F4F9] ${hasData ? 'pt-4' : 'pt-0'}`}
      >
        <div className='w-full px-4'>
          {Object.keys(groupedByFirmAndDay).map((firm, index) => (
            <div key={index}>
              <div className='mb-2 text-start font-bold'>{firm}</div>
              {groupedByFirmAndDay[firm].availability &&
                Object.keys(groupedByFirmAndDay[firm].availability).map(day => {
                  const timeRanges =
                    groupedByFirmAndDay[firm].availability[day] || []
                  const tags = timeRanges.map(
                    timeRange =>
                      `${day}: ${timeRange.fromTime} - ${timeRange.toTime}`
                  )

                  return (
                    <div
                      key={`${firm}-${day}`}
                      className='mb-4 flex w-full flex-wrap gap-[10px]'
                    >
                      <Tags tags={tags} />
                    </div>
                  )
                })}
            </div>
          ))}
        </div>

        <div className='flex w-full flex-col justify-between rounded-[16px] border-0 bg-[#F9F9F9] p-4'>
          <div
            className='flex cursor-pointer items-center justify-between'
            onClick={handleOpenDrawer}
          >
            <Image
              src={'/icons/calendar-profile.svg'}
              width={30}
              height={30}
              alt='calendar-icon'
              className='pr-[13px]'
            />
            <p className='flex-grow text-start text-xs font-bold text-[#2C2F35]'>
              Edit Availability Schedule
            </p>
            <ChevronRight color='#13C2C2' width={24} height={24} />
          </div>
        </div>
      </div>

      <MedalCollection medals={medalLists} isDisabled={true} />
      <Settings menus={settingMenus} />
      <Drawer onClose={() => setIsDrawerOpen(false)} open={isDrawerOpen}>
        <div className='max-h-screen'>
          <DrawerContent className='mx-auto flex max-h-screen flex-col overflow-y-hidden px-4 py-1'>
            <DrawerTitle></DrawerTitle>
            <DrawerDescription className='my-2 flex-grow overflow-y-auto'>
              {daysOfWeek.map((day, dayIndex) => {
                const checkSchedule = formsState[day].some(form =>
                  form.times.some(
                    time => time.fromTime !== '--:--' && time.toTime !== '--:--'
                  )
                )
                return (
                  <Collapsible
                    key={day}
                    day={day}
                    isOpen={activeDayIndex === dayIndex}
                    onToggle={() =>
                      setActiveDayIndex(
                        activeDayIndex === dayIndex ? null : dayIndex
                      )
                    }
                    hasSchedules={checkSchedule}
                  >
                    {formsState[day].map((form, formIndex) => (
                      <div key={`${day}-${formIndex}`}>
                        {form.times.map((time, timeIndex) => (
                          <div
                            key={`${day}-${formIndex}-${timeIndex}`}
                            className='flex w-full items-start justify-between py-2'
                          >
                            <div className='flex flex-grow flex-col items-center'>
                              <DropdownProfile
                                options={firms}
                                value={time.firm}
                                onSelect={value =>
                                  handleCompanyChange(
                                    formsState,
                                    day,
                                    formIndex,
                                    timeIndex,
                                    value,
                                    setFormsState,
                                    setErrorMessages
                                  )
                                }
                                placeholder='Choose your firm'
                              />
                              <div className='flex w-full items-center justify-between'>
                                <div className='flex items-center justify-center pl-1'>
                                  <span className='text-sm font-medium'>
                                    From
                                  </span>
                                  <input
                                    type='time'
                                    className='block w-full rounded-lg bg-gray-50 p-2.5 text-sm text-gray-900 focus:outline-none dark:bg-gray-700 dark:text-white'
                                    value={time.fromTime}
                                    onChange={e =>
                                      handleTimeChange(
                                        day,
                                        formIndex,
                                        timeIndex,
                                        'from',
                                        e.target.value,
                                        formsState,
                                        setFormsState,
                                        setErrorMessages
                                      )
                                    }
                                    required
                                  />
                                </div>
                                <div className='flex w-3 flex-grow' />
                                <div className='flex items-center justify-end'>
                                  <span className='text-sm font-medium'>
                                    To
                                  </span>

                                  <input
                                    type='time'
                                    className='block w-full rounded-lg bg-gray-50 p-2.5 text-sm text-gray-900 focus:outline-none dark:bg-gray-700 dark:text-white'
                                    value={time.toTime}
                                    onChange={e =>
                                      handleTimeChange(
                                        day,
                                        formIndex,
                                        timeIndex,
                                        'to',
                                        e.target.value,
                                        formsState,
                                        setFormsState,
                                        setErrorMessages
                                      )
                                    }
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                            <div className='flex flex-col items-center pl-4 pt-4'>
                              <Trash2
                                size={20}
                                onClick={() =>
                                  handleRemoveTimeRange(
                                    day,
                                    formIndex,
                                    timeIndex,
                                    formsState,
                                    setFormsState,
                                    setErrorMessages
                                  )
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className='flex w-full items-center justify-end'>
                      {errorMessages[day] && (
                        <div className='px-2 text-sm text-red-500'>
                          {errorMessages[day]}
                        </div>
                      )}
                      <div className='m-4 mx-2 h-[30px] w-[30px] rounded-2xl bg-secondary'>
                        <Plus
                          color='white'
                          size={30}
                          onClick={() =>
                            handleAddForm(
                              day,
                              formsState,
                              setFormsState,
                              setErrorMessages
                            )
                          }
                        />
                      </div>

                      <Button
                        className='bg-[#E1E1E1] font-bold text-[#2C2F35]'
                        onClick={handleSave}
                      >
                        Save
                      </Button>
                    </div>
                  </Collapsible>
                )
              })}
            </DrawerDescription>
          </DrawerContent>
        </div>
      </Drawer>
    </>
  )
}
