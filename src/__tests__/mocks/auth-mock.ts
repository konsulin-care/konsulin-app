/** Auth state shape consumed by research components. */
export interface AuthState {
  isLoading: boolean;
  state: {
    isAuthenticated: boolean;
    userInfo: { fhirId?: string; role_name?: string };
  };
}

const DEFAULT_PATIENT: AuthState = {
  isLoading: false,
  state: {
    isAuthenticated: true,
    userInfo: { fhirId: 'PAT-1', role_name: 'Patient' }
  }
};

const DEFAULT_RESEARCHER: AuthState = {
  isLoading: false,
  state: {
    isAuthenticated: true,
    userInfo: { fhirId: 'test-practitioner-id', role_name: 'Researcher' }
  }
};

/**
 * Create an auth state object for testing.
 * @param overrides - Partial overrides for userInfo
 */
export function mockAuthState(
  overrides?: Partial<AuthState['state']['userInfo']>
): AuthState {
  return {
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: {
        fhirId: 'test-practitioner-id',
        role_name: 'Researcher',
        ...overrides
      }
    }
  };
}

export {
  DEFAULT_PATIENT as PATIENT_AUTH_STATE,
  DEFAULT_RESEARCHER as RESEARCHER_AUTH_STATE
};
