import { validateEmail } from '@/utils/validation';
import { useMutation } from '@tanstack/react-query';
import { Bundle, Patient, Practitioner } from 'fhir/r4';
import { apiRequest, getAPI } from './api';

type IProfileRequest = {
  payload: Patient | Practitioner;
};

type EmailExistenceResponse = {
  exists: boolean;
  patientIds: string[];
  practitionerIds: string[];
  status: string;
};

type ModifyProfileResponseItem = {
  chatwoot_id?: number | string;
  email?: string;
  phone_number?: string;
};

export const createProfile = async ({ userId, email, phoneNumber, type }) => {
  const telecom = [];

  if (email && typeof email === 'string' && email.trim() !== '') {
    telecom.push({
      system: 'email',
      use: 'home',
      value: email.trim()
    });
  }

  if (
    phoneNumber &&
    typeof phoneNumber === 'string' &&
    phoneNumber.trim() !== ''
  ) {
    telecom.push({
      system: 'phone',
      use: 'mobile',
      value: phoneNumber.trim()
    });
  }

  const payload = {
    resourceType: type,
    active: true,
    identifier: userId
      ? [
          {
            system: 'https://login.konsulin.care/userid',
            value: userId
          }
        ]
      : [],
    ...(telecom.length > 0 && { telecom })
  };

  try {
    const response = await apiRequest<Patient | Practitioner>(
      'POST',
      `/fhir/${type}`,
      payload
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const getProfileByIdentifier = async ({ userId, type }) => {
  try {
    const bundle = await apiRequest<Bundle>(
      'GET',
      `/fhir/${type}?identifier=https://login.konsulin.care/userid|${userId}`
    );

    const entries = bundle?.entry;

    if (Array.isArray(entries) && entries.length > 0) {
      return entries[0]?.resource;
    }

    return null;
  } catch (error) {
    throw error;
  }
};

export const getProfileById = async (
  id: string,
  type: 'Patient' | 'Practitioner'
) => {
  try {
    if (!id) throw new Error('Missing FHIR id');

    const response = await apiRequest<Patient | Practitioner>(
      'GET',
      `/fhir/${type}/${id}`
    );

    return response;
  } catch (error) {
    throw error;
  }
};

export const checkEmailExists = async (email: string) => {
  const encodedEmail = encodeURIComponent(email);
  return apiRequest<EmailExistenceResponse>(
    'GET',
    `/api/v1/auth/passwordless/email/exists?email=${encodedEmail}`
  );
};

export const signupByEmail = async (email: string) => {
  if (!email) throw new Error('Missing email');

  return apiRequest('POST', '/api/v1/auth/signinup/code', {
    email,
    shouldTryLinkingWithSessionUser: false
  });
};

export const useUpdateProfile = () => {
  return useMutation<Patient | Practitioner, Error, IProfileRequest>({
    mutationKey: ['update-profile'],
    mutationFn: async ({ payload }) => {
      const { id, resourceType } = payload;
      try {
        const API = await getAPI();
        const response = await API.put(`/fhir/${resourceType}/${id}`, payload);
        return response.data;
      } catch (error) {
        console.error(`Error updating profile ${resourceType} : `, error);
        throw error;
      }
    }
  });
};

export const modifyProfile = async ({
  email,
  phoneNumber,
  name
}: {
  email?: string | null;
  phoneNumber?: string | null;
  name: string;
}): Promise<{
  chatwootId: string;
  email?: string;
  phoneNumber?: string;
}> => {
  const trimmedName = (name || '').trim();
  const trimmedEmail = (email ?? '').trim();
  const trimmedPhone = (phoneNumber ?? '').trim();
  // Ensure phone sent upstream always has a single leading plus sign
  const phoneForRequest = trimmedPhone
    ? trimmedPhone.startsWith('+')
      ? trimmedPhone.replace(/^\++/, '+')
      : `+${trimmedPhone}`
    : '';

  if (!trimmedName) {
    throw new Error('Missing name for modify-profile');
  }

  if (!trimmedEmail && !trimmedPhone) {
    throw new Error('Missing email or phoneNumber for modify-profile');
  }

  if (trimmedEmail && !validateEmail(trimmedEmail)) {
    throw new Error('Invalid email for modify-profile');
  }

  const body: Record<string, string> = {
    name: trimmedName
  };
  if (trimmedEmail) body.email = trimmedEmail;
  if (phoneForRequest) body.phoneNumber = phoneForRequest;

  const API = await getAPI();

  const response = await API.post(
    '/api/v1/hook/synchronous/modify-profile',
    body
  );

  const isOk = response?.status >= 200 && response?.status < 300;
  const data = response?.data;
  const first: ModifyProfileResponseItem | null =
    Array.isArray(data) && data.length > 0 ? data[0] : null;
  const chatwootId = first?.chatwoot_id;

  if (!isOk || !chatwootId) {
    throw new Error('Invalid modify-profile response');
  }

  return {
    chatwootId: String(chatwootId),
    ...(first?.email != null && first.email !== '' && { email: first.email }),
    ...(first?.phone_number != null &&
      first.phone_number !== '' && { phoneNumber: first.phone_number })
  };
};

export const uploadAvatar = async (
  chatwootId: string,
  file: File | Blob
): Promise<string> => {
  if (!chatwootId) throw new Error('Missing chatwoot_id');

  const formData = new FormData();
  formData.append('chatwoot_id', chatwootId);
  formData.append('avatar', file);

  const API = await getAPI();
  let response;
  try {
    response = await API.post(
      '/api/v1/hook/synchronous/update-avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
  } catch (error: any) {
    throw new Error('Failed to upload avatar');
  }

  const isOk = response?.status >= 200 && response?.status < 300;
  const url =
    Array.isArray(response?.data) && response.data.length > 0
      ? response.data[0]?.avatar_url
      : null;

  if (!isOk || !url) {
    throw new Error('Failed to upload avatar');
  }

  return url;
};
