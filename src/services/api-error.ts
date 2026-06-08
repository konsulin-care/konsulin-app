/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AxiosError } from 'axios';

export type ParsedAxiosError = {
  errorMessage: string;
  devMessage: string;
  status?: number;
  isExpiredToken: boolean;
  isMissingToken: boolean;
};

/**
 *
 */
export function parseAxiosError(err: unknown): ParsedAxiosError {
  const error = err as Partial<AxiosError & { message?: string }> | undefined;
  const response = error?.response as any as any | undefined;
  const data =
    response && typeof response.data === 'object'
      ? (response.data as any)
      : undefined;

  let messageFromResponse: string | undefined;
  if (typeof data?.message === 'string') {
    messageFromResponse = data.message;
  } else if (typeof response?.data === 'string') {
    messageFromResponse = response.data as string;
  }

  const errorMessage =
    messageFromResponse ||
    (error?.message as string | undefined) ||
    'An unexpected error occured!';
  const devMessage =
    typeof (data as any)?.dev_message === 'string'
      ? (data as any).dev_message
      : '';
  const status =
    typeof response?.status === 'number'
      ? (response.status as number)
      : undefined;

  const isExpiredToken =
    status === 401 &&
    devMessage === 'invalid or expired token: Token is expired';
  const isMissingToken = devMessage === 'token missing';

  return { errorMessage, devMessage, status, isExpiredToken, isMissingToken };
}
