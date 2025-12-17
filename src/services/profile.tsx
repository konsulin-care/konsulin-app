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

export const createProfile = async ({ userId, email, type }) => {
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
    telecom: {
      system: 'email',
      use: 'home',
      value: email
    }
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

export const uploadAvatar = async (
  chatwootId: string,
  file: File | Blob
): Promise<string> => {
  if (!chatwootId) throw new Error('Missing chatwoot_id');

  const formData = new FormData();
  formData.append('chatwoot_id', chatwootId);
  formData.append('avatar', file);

  const API = await getAPI();
  const response = await API.post(
    '/api/v1/hook/synchronous/update-avatar',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );

  const isOk = response?.status >= 200 && response?.status < 300;
  const url = response?.data?.[0]?.avatar_url;

  if (!isOk || !url) {
    throw new Error('Failed to upload avatar');
  }

  return url;
};
