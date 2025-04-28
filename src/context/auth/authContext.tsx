'use client';

import { getCookie } from 'cookies-next';
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useReducer
} from 'react';
import { useSessionContext } from 'supertokens-auth-react/recipe/session';
import { initialState, reducer } from './authReducer';
import { IStateAuth } from './authTypes';

interface ContextProps {
  loading: boolean;
  state: IStateAuth;
  dispatch: React.Dispatch<any>;
}

const AuthContext = createContext<ContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // const [isLoading, setisLoading] = useState(true);
  const [state, dispatch] = useReducer(reducer, initialState);

  const session = useSessionContext();

  useEffect(() => {
    const auth = JSON.parse(decodeURI(getCookie('auth') || '{}'));

    const payload = {
      token: auth.token,
      role_name: auth.role_name || 'guest',
      fullname: auth.fullname || auth.email,
      email: auth.email,
      id: auth.id,
      profile_picture: auth.profile_picture
    };

    if (!session.loading) {
      console.log('session data : ', session);
      dispatch({
        type: 'auth-check',
        session
      });
    }

    // dispatch({
    //   type: 'auth-check',
    //   payload
    // });
  }, [session.loading]);

  return (
    <AuthContext.Provider value={{ loading: session.loading, state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): ContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a AuthProvider');
  }

  return context;
};
