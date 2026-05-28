'use client';

import {
  ANONYMOUS_SESSION_GUEST_ID_STORAGE_KEY,
  ANONYMOUS_SESSION_IDENTIFIER_SYSTEM
} from '@/constants/anonymous-session';
import { getAPI } from '@/services/api';
import { Identifier } from 'fhir/r4';

type AnonymousSessionResponse = {
  token?: string;
  guest_id?: string;
};

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

export const getCachedGuestId = (): string | null => {
  // 1. Check meta tag injected by Go SSR base layout
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="konsulin-guest-id"]');
    const content = meta?.getAttribute('content');
    if (content) return content;

    // 2. Check guest_session cookie (set by OptionalAuth middleware)
    const match = document.cookie.match(
      /(?:^|;\s*)guest_session=([^;]*)/
    );
    if (match) {
      try {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        if (parsed.guestId) return parsed.guestId;
      } catch {}
    }
  }

  // 3. Fall back to localStorage (legacy Next.js pages)
  try {
    return localStorage.getItem(ANONYMOUS_SESSION_GUEST_ID_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const cacheGuestId = (guestId: string) => {
  try {
    localStorage.setItem(ANONYMOUS_SESSION_GUEST_ID_STORAGE_KEY, guestId);
  } catch {
    // ignore storage errors
  }
};

export const ensureAnonymousSession = async (
  forceNew: boolean = false
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

  cacheGuestId(guestId);
  return guestId;
};

export const buildAnonymousIdentifier = (guestId: string): Identifier => {
  return {
    system: ANONYMOUS_SESSION_IDENTIFIER_SYSTEM,
    value: guestId
  };
};
