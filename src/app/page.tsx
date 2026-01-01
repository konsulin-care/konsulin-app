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
    if (!isLoading) {
      const storedRedirect = localStorage.getItem('redirect');
      if (storedRedirect) {
        localStorage.removeItem('redirect');
        router.push(decodeURIComponent(storedRedirect));
        return;
      }

      if (authState.isAuthenticated) {
        const intent = getIntent();
        if (intent) {
          const handleIntent = async () => {
            try {
              if (intent.kind === 'journal') {
                clearIntent();
                router.push(intent.payload.path);
                return;
              }

              if (intent.kind === 'appointment') {
                // Do not clear intent here, let the page handle it
                router.push(intent.payload.path);
                return;
              }

              if (intent.kind === 'assessmentResult') {
                const { responseId, path } = intent.payload;
                const api = await getAPI();
                const { data: existingResponse } = await api.get(
                  `/fhir/QuestionnaireResponse/${responseId}`
                );

                const authorType = authState.userInfo.role_name;
                const authorRef = `${authorType}/${authState.userInfo.fhirId}`;

                const updatedResponse = {
                  ...existingResponse,
                  author: { reference: authorRef },
                  subject: { reference: `Patient/${authState.userInfo.fhirId}` }
                };

                await api.put(
                  `/fhir/QuestionnaireResponse/${responseId}`,
                  updatedResponse
                );

                // remove legacy localstorage response key if exists
                if (existingResponse.questionnaire) {
                  const legacyKey = `response_${existingResponse.questionnaire.split('/')[1]}`;
                  localStorage.removeItem(legacyKey);
                }
                localStorage.removeItem('skip-response-cleanup');

                clearIntent();
                toast.success(
                  'Your assessment result is now linked to your account.'
                );
                router.push(path);
                return;
              }
            } catch (error) {
              console.error('Failed to restore intent:', error);
              clearIntent();
              setIsRedirecting(false);
            }
          };

          handleIntent();
          return;
        }
      }

      setIsRedirecting(false);
    }
  }, [isLoading, authState.isAuthenticated, authState.userInfo, router]);

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
