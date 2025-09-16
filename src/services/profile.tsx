import { useMutation } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';
import { Patient, Practitioner } from 'fhir/r4';
import { apiRequest, getAPI } from './api';

type IProfileRequest = {
  payload: Patient | Practitioner;
};

export const createProfile = async ({ userId, email, type }) => {
  const payload = {
    resourceType: type,
    active: true,
    identifier: [
      {
        system: 'https://login.konsulin.care/userid',
        value: userId
      }
    ],
    telecom: {
      system: 'email',
      use: 'home',
      value: email
    }
  };

  try {
    const response = await apiRequest<AxiosResponse>(
      'POST',
      `/fhir/${type}`,
      payload
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getProfileByIdentifier = async ({ userId, type }) => {
  try {
    const response = await apiRequest<AxiosResponse>(
      'GET',
      `/fhir/${type}?identifier=https://login.konsulin.care/userid|${userId}`
    );

    const entries = response?.data?.entry;

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
    const response = await apiRequest<AxiosResponse>(
      'GET',
      `/fhir/${type}/${id}`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
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
