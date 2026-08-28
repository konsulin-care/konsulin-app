'use client';

import { markKeySet } from '@/lib/admin/session';
import { parseAdminKeyError, setAdminKey } from '@/services/admin-api';
import { useState } from 'react';

interface AdminKeyGateProps {
  /** Called after the BFF accepts the key and the session flag is set. */
  onUnlocked?: () => void;
}

/**
 * Gate shown before the superadmin console when no key session exists.
 * Submits the key to the BFF (which stores it in an HttpOnly cookie) and
 * marks the session flag on success. On failure, surfaces the backend message
 * without echoing the key. Calls onUnlocked once the session is established.
 */
export function AdminKeyGate({ onUnlocked }: Readonly<AdminKeyGateProps>) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Submits the API key to the BFF and marks the session on success. */
  const handleSubmit = async () => {
    if (!apiKey.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await setAdminKey(apiKey.trim());
      markKeySet();
      onUnlocked?.();
    } catch (err) {
      setError(parseAdminKeyError(err));
      setSubmitting(false);
    }
  };

  return (
    <form
      className='mx-auto mt-16 flex max-w-md flex-col gap-3'
      onSubmit={e => {
        e.preventDefault();
        // deepsource:ignore JS-0098 — void discards promise rejection in event handler
        void handleSubmit();
      }}
    >
      <h1 className='text-lg font-semibold'>Superadmin access</h1>
      <p className='text-sm text-slate-500'>
        Enter the superadmin API key to unlock the console.
      </p>
      <input
        type='password'
        aria-label='API key'
        value={apiKey}
        onChange={e => {
          setApiKey(e.target.value);
        }}
        placeholder='superadmin API key'
        className='rounded-md border border-slate-300 px-3 py-2'
        autoComplete='off'
      />
      {error && <p className='text-sm text-red-600'>{error}</p>}
      <button
        type='submit'
        disabled={submitting || !apiKey.trim()}
        className='rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
      >
        {submitting ? 'Unlocking…' : 'Unlock'}
      </button>
    </form>
  );
}
