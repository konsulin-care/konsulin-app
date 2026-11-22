/* eslint-disable complexity */
import type { AxiosError } from 'axios';

/**
 * Error thrown by the API response interceptor. Carries the original axios
 * error details (status, code, response) while keeping the legacy message
 * text produced by `String(error)`.
 */
export class ApiError extends Error {
  /** HTTP status from the failed response, when one was received. */
  status?: number;

  /** Axios error code such as `ERR_NETWORK` or `ERR_BAD_REQUEST`. */
  code?: string;

  /** Raw failed response, when one was received. */
  response?: unknown;

  /** The original thrown axios error. */
  cause?: unknown;

  /**
   * Builds an ApiError from an arbitrary axios error value.
   *
   * @param error - The original axios error.
   */
  constructor(error: unknown) {
    // String() preserves the legacy message text consumers already rely on.
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    super(String(error));
    this.name = 'ApiError';

    const original = error as
      Partial<AxiosError & { code?: string; response?: unknown }> | undefined;
    const response = original?.response as { status?: unknown } | undefined;

    this.status =
      typeof response?.status === 'number' ? response.status : undefined;
    this.code = typeof original?.code === 'string' ? original.code : undefined;
    this.response = response;
    this.cause = error;
  }
}

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
    { data: unknown; status: number } | undefined;
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
