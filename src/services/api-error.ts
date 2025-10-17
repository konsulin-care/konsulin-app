import type { AxiosError } from 'axios';

export type ParsedAxiosError = {
  errorMessage: string;
  devMessage: string;
  status?: number;
  isExpiredToken: boolean;
  isMissingToken: boolean;
};

export function parseAxiosError(err: unknown): ParsedAxiosError {
  const error = err as Partial<AxiosError & { message?: string }> | undefined;
  const response = error?.response as any as any | undefined;
  const data =
    response && typeof response.data === 'object'
      ? (response.data as any)
      : undefined;

  const messageFromResponse =
    typeof data?.message === 'string'
      ? data.message
      : typeof response?.data === 'string'
        ? (response.data as string)
        : undefined;

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
