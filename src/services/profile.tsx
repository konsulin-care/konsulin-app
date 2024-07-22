import { apiRequest } from './api'

export interface ProfileData {
  fullname: string
  email: string
  age: number
  sex: string
  education: string
  whatsapp_number: string
  address: string
  birth_date: string
}

export interface ResponseProfile {
  success: boolean
  message: string
  data: ProfileData
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
