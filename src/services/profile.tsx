import { AxiosResponse } from 'axios';
import { apiRequest } from './api';

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
      `/fhir/${type}?identifier=${userId}`
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
