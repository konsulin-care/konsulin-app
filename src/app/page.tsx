'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import NavigationBar from '@/components/navigation-bar';
import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import { clearIntent, getIntent } from '@/utils/intent-storage';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import HomeContent from './home-content';
import HomeHeader from './home-header';

const App = () => {
  const { isLoading, state: authState } = useAuth();
  const router = useRouter();

  const [isRedirecting, setIsRedirecting] = useState(true);
  const isHandlingIntentRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    let storedRedirect: string | null = null;
    try {
      storedRedirect = localStorage.getItem('redirect');
      if (storedRedirect) {
        localStorage.removeItem('redirect');
      }
    } catch (error) {
      console.error('Failed to access redirect in localStorage:', error);
      setIsRedirecting(false);
      return;
    }

    if (storedRedirect) {
      try {
        const decoded = decodeURIComponent(storedRedirect);
        if (decoded.startsWith('/') && !decoded.startsWith('//')) {
          const currentPath =
            window.location.pathname +
            window.location.search +
            window.location.hash;
          if (decoded === currentPath) {
            setIsRedirecting(false);
            return;
          }
          router.push(decoded);
          return;
        }
        console.warn('Invalid redirect path (not relative):', decoded);
        setIsRedirecting(false);
        return;
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
          if (isHandlingIntentRef.current) return;
          isHandlingIntentRef.current = true;
          try {
            if (intent.kind === 'journal') {
              router.push(intent.payload.path);
              clearIntent();
              return;
            }

            if (intent.kind === 'appointment') {
              router.push(intent.payload.path);
              clearIntent();
              return;
            }

            if (intent.kind === 'assessmentResult') {
              const { responseId, path } = intent.payload;
              if (!authState.userInfo?.role_name || !authState.userInfo?.fhirId) {
                console.error('Missing user info for assessment linking');
                clearIntent();
                isHandlingIntentRef.current = false;
                setIsRedirecting(false);
                router.push(path);
                return;
              }
              const authorTypeRaw = authState.userInfo.role_name;
              const roleMap: Record<string, string> = {
                clinician: 'Practitioner',
                patient: 'Patient'
              };
              const authorType =
                roleMap[authorTypeRaw] ??
                (authorTypeRaw
                  ? authorTypeRaw.charAt(0).toUpperCase() + authorTypeRaw.slice(1)
                  : authorTypeRaw);
              const api = await getAPI();

              const { data: existingResponse } = await api.get(
                `/fhir/QuestionnaireResponse/${responseId}`
              );

              const authorRef = `${authorType}/${authState.userInfo.fhirId}`;

              const updatedResponse = {
                ...existingResponse,
                author: { reference: authorRef },
                subject:
                  existingResponse.subject ?? {
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
                const segments = existingResponse.questionnaire
                  .split('/')
                  .filter(Boolean);
                const legacyKey = `response_${segments[segments.length - 1]}`;
                if (legacyKey) localStorage.removeItem(legacyKey);
              }

              localStorage.removeItem('skip-response-cleanup');
              toast.success(
                'Your assessment result is now linked to your account.'
              );

              router.push(path);
              clearIntent();
              return;
            }
          } catch (error) {
            console.error('Failed to restore intent:', error);
            toast.error(
              'Failed to link your assessment result. Please try again.'
            );
            clearIntent();
          } finally {
            setIsRedirecting(false);
            isHandlingIntentRef.current = false;
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
