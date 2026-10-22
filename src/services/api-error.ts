/* eslint-disable complexity */
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
  const response = error?.response as
    | { data: unknown; status: number }
    | undefined;
  const data: Record<string, unknown> | undefined =
    response && typeof response.data === 'object'
      ? (response.data as Record<string, unknown>)
      : undefined;

  let messageFromResponse: string | undefined;
  if (typeof data?.message === 'string') {
    messageFromResponse = data.message;
  } else if (typeof response?.data === 'string') {
    messageFromResponse = response.data;
  }

  const errorMessage =
    messageFromResponse || error?.message || 'An unexpected error occured!';
  const devMessage =
    typeof data?.dev_message === 'string' ? data.dev_message : '';
  const status =
    typeof response?.status === 'number' ? response.status : undefined;

  const isExpiredToken =
    status === 401 &&
    devMessage === 'invalid or expired token: Token is expired';
  const isMissingToken = devMessage === 'token missing';

  return { errorMessage, devMessage, status, isExpiredToken, isMissingToken };
}
