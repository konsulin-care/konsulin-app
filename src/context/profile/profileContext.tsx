'use client';
/* eslint-disable sonarjs/no-commented-code */

import React, { ReactNode, createContext, useContext, useReducer } from 'react';
import { initialState, reducer } from './profileReducer';
import { ActionProfile, IProfile } from './profileTypes';

// interface ProfileContextProps {
//   state: StateProfile
//   dispatch: React.Dispatch<ActionProfile>
// }

interface ProfileContextProps {
  state: IProfile;
  dispatch: React.Dispatch<ActionProfile>;
}

const ProfileContext = createContext<
  | {
      state: IProfile;
      dispatch: React.Dispatch<ActionProfile>;
    }
  | undefined
>(undefined);

/** Profile context provider wrapping children with profile state. */
export const ProfileProvider: React.FC<{ children: ReactNode }> = ({
  children
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <ProfileContext.Provider value={{ state, dispatch }}>
      {children}
    </ProfileContext.Provider>
  );
};

/** Hook to access profile context; throws if used outside provider. */
export const useProfile = (): ProfileContextProps => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
