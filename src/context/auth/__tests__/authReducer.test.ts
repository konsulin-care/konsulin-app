import { Roles } from '@/constants/roles';
import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../authReducer';

describe('authReducer', () => {
  it('handles login action', () => {
    const payload = {
      userId: 'user-1',
      fullname: 'Test User',
      email: 'test@example.com',
      role_name: Roles.Patient,
      profile_picture: '',
      fhirId: 'pt-1',
      profile_complete: true
    };

    const nextState = reducer(initialState, { type: 'login', payload });
    expect(nextState.isAuthenticated).toBe(true);
    expect(nextState.userInfo).toEqual(payload);
  });

  it('handles auth-check action', () => {
    const payload = {
      userId: 'user-2',
      role_name: Roles.Practitioner
    };

    const nextState = reducer(initialState, { type: 'auth-check', payload });
    expect(nextState.isAuthenticated).toBe(true);
    expect(nextState.userInfo).toEqual(payload);
  });

  it('handles logout action', () => {
    const loggedIn = reducer(initialState, {
      type: 'login',
      payload: { userId: 'u1', role_name: Roles.Patient }
    });
    const loggedOut = reducer(loggedIn, { type: 'logout' });
    expect(loggedOut.isAuthenticated).toBe(false);
    expect(loggedOut.userInfo).toEqual(initialState.userInfo);
  });

  it('returns unchanged state for unknown action', () => {
    const state = reducer(initialState, { type: 'unknown' } as never);
    expect(state).toEqual(initialState);
  });
});
