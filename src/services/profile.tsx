import { apiRequest } from './api'

export type ResponseGenders = {
  success: boolean
  message: string
  data: Options[]
}
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
}

export interface ResponseEducations {
  success: boolean
  message: string
  data: Options[]
}

export const fetchProfile = async (
  state: any,
  dispatch: React.Dispatch<any>
): Promise<ResponseProfile> => {
  try {
    const response = await apiRequest('GET', '/api/v1/users/profile')
    const responseData = response as ResponseProfile
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
    const responseData = response as ResponseGenders
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
    const responseData = response as ResponseEducations
    if (responseData.success) {
      return responseData.data
    } else {
      throw new Error(responseData.message)
    }
  } catch (err) {
    throw err
  }
}
