'use client';

import { ANONYMOUS_SESSION_IDENTIFIER_SYSTEM } from '@/constants/anonymous-session';
import { getAPI } from '@/services/api';
import { Identifier } from 'fhir/r4';

type AnonymousSessionResponse = {
  token?: string;
  guest_id?: string;
};

/** Decodes the payload of a JWT token without verification. */
export const decodeJwtPayload = (
  token: string
): Record<string, unknown> | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

/**
 * Ensures an anonymous session exists, creating one if needed.
 * Returns the resolved guest ID from the session token or response body.
 */
export const ensureAnonymousSession = async (
  forceNew = false
): Promise<string> => {
  const API = await getAPI();
  const url = '/api/v1/auth/anonymous-session';
  const config = forceNew ? { params: { force_new: 'true' } } : undefined;
  const response = await API.post<{ data?: AnonymousSessionResponse }>(
    url,
    undefined,
    config
  );

  const payload = response.data?.data ?? {};
  const token = payload.token?.trim() ?? '';
  const guestIdFromResponse = payload.guest_id?.trim() ?? '';

  let guestId = '';
  if (token) {
    const decoded = decodeJwtPayload(token);
    const claim = decoded?.guest_id;
    if (typeof claim === 'string') {
      guestId = claim;
    }
  }

  if (!guestId && guestIdFromResponse) {
    guestId = guestIdFromResponse;
  }

  if (!guestId) {
    throw new Error('Failed to resolve guest_id from anonymous session');
  }

  return guestId;
};

/** Builds a FHIR Identifier for the anonymous session guest ID. */
export const buildAnonymousIdentifier = (guestId: string): Identifier => {
  return {
    system: ANONYMOUS_SESSION_IDENTIFIER_SYSTEM,
    value: guestId
  };
};
