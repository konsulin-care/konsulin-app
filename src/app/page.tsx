'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import NavigationBar from '@/components/navigation-bar';
import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import { clearIntent, getIntent } from '@/utils/intent-storage';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import HomeContent from './home-content';
import HomeHeader from './home-header';

const App = () => {
  const { isLoading, state: authState } = useAuth();
  const router = useRouter();

  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    const storedRedirect = localStorage.getItem('redirect');
    if (storedRedirect) {
      localStorage.removeItem('redirect');
      try {
        const decoded = decodeURIComponent(storedRedirect);
        if (decoded.startsWith('/')) {
          if (decoded === window.location.pathname) {
            setIsRedirecting(false);
            return;
          }
          router.push(decoded);
          return;
        }
      } catch (error) {
        console.error('Invalid redirect value in localStorage:', error);
        setIsRedirecting(false);
        return;
      }
    }

    if (authState.isAuthenticated) {
      const intent = getIntent();

      if (intent) {
        const handleIntent = async () => {
          clearIntent();
          try {
            if (intent.kind === 'journal') {
              router.push(intent.payload.path);
              return;
            }

            if (intent.kind === 'appointment') {
              router.push(intent.payload.path);
              return;
            }

            if (intent.kind === 'assessmentResult') {
              const { responseId, path } = intent.payload;
              if (!authState.userInfo?.role_name || !authState.userInfo?.fhirId) {
                console.error('Missing user info for assessment linking');
                router.push(path);
                return;
              }
              const api = await getAPI();

              const { data: existingResponse } = await api.get(
                `/fhir/QuestionnaireResponse/${responseId}`
              );

              const authorType = authState.userInfo.role_name;
              const authorRef = `${authorType}/${authState.userInfo.fhirId}`;

              const updatedResponse = {
                ...existingResponse,
                author: { reference: authorRef },
                subject: {
                  reference: `${authorType}/${authState.userInfo.fhirId}`
                }
              };

              await api.put(
                `/fhir/QuestionnaireResponse/${responseId}`,
                updatedResponse
              );

              if (
                typeof existingResponse.questionnaire === 'string' &&
                existingResponse.questionnaire
              ) {
                const legacyKey = `response_${existingResponse.questionnaire.split('/')[1]}`;
                if (legacyKey) localStorage.removeItem(legacyKey);
              }

              localStorage.removeItem('skip-response-cleanup');
              toast.success(
                'Your assessment result is now linked to your account.'
              );

              router.push(path);
              return;
            }
          } catch (error) {
            console.error('Failed to restore intent:', error);
          } finally {
            setIsRedirecting(false);
          }
        };

        handleIntent();
        return;
      }

    }

    setIsRedirecting(false);
  }, [isLoading, authState, router]);

  if (isLoading || isRedirecting) {
    return (
      <div className='mt-[-24px] flex min-h-screen min-w-full items-center justify-center rounded-[16px] bg-white pt-4 pb-[100px]'>
        <LoadingSpinnerIcon
          width={60}
          height={60}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  return (
    <>
      <NavigationBar />
      <HomeHeader />
      <HomeContent />
    </>
  );
};

export default App;
