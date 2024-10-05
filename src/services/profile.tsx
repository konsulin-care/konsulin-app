import { apiRequest } from './api'

export interface ResponseProfile {
  success: boolean
  message: string
  data: ProfileData
}

export type Options = {
  name: string
}
export interface ProfileData {
  fullname: string
  email: string
  age: number
  gender: string
  educations: string[]
  whatsapp_number: string
  address: string
  birth_date: string
  practice_informations?: PracticeInformation[]
  practice_availabilities?: PracticeAvailability[]
  profile_picture?: string
}

export interface PracticeInformation {
  clinic_id: string
  clinic_name: string
  affiliation: string
  price_per_session: PricePerSession
}

export interface PricePerSession {
  value: number
  currency: string
}

export interface PracticeAvailability {
  clinic_id: string
  available_time: AvailableTime[]
}
export interface ResponseOptions {
  success: boolean
  message: string
  data: Options[]
}
export interface AvailableTime {
  days_of_Week: string[]
  available_start_time: string
  available_end_time: string
}

export interface Clinic {
  clinic_id: string
  clinic_name: string
  tags?: string[]
}

export interface Pagination {
  total: number
  page: number
  page_size: number
  next_url: string
}

export interface ResponseListClinics {
  success: boolean
  message: string
  data: Clinic[]
  pagination: Pagination
}

export interface AvailableTime {
  days_of_week: string[]
  available_start_time: string
  available_end_time: string
}

export interface RequestAvailableTime {
  clinic_ids: string[]
  available_times: Record<string, AvailableTime[]>
}

export const fetchProfile = async (
  state: any,
  dispatch: React.Dispatch<any>
): Promise<ResponseProfile> => {
  try {
    const response = await apiRequest('GET', '/api/v1/users/profile')
    const responseData: ResponseProfile = response as ResponseProfile
    if (responseData.success) {
      dispatch({
        type: 'getProfile',
        payload: {
          profile: {
            ...state.profile,
            ...responseData.data
          }
        }
      })
    }
    return responseData
  } catch (err) {
    throw err
  }
}

export const fetchGenders = async (): Promise<Options[]> => {
  try {
    const response = await apiRequest('GET', '/api/v1/genders')
    const responseData = response as ResponseOptions
    if (responseData.success) {
      return responseData.data
    } else {
      throw new Error(responseData.message)
    }
  } catch (err) {
    throw err
  }
}

export const fetchEducations = async (): Promise<Options[]> => {
  try {
    const response = await apiRequest('GET', '/api/v1/education-levels')
    const responseData = response as ResponseOptions
    if (responseData.success) {
      return responseData.data
    } else {
      throw new Error(responseData.message)
    }
  } catch (err) {
    throw err
  }
}

export const fetchListClinic = async (): Promise<Clinic[]> => {
  try {
    const response = await apiRequest('GET', '/api/v1/clinics')
    const responseData = response as ResponseListClinics
    if (responseData.success) {
      return responseData.data
    } else {
      throw new Error(responseData.message)
    }
  } catch (err) {
    throw err
  }
}
