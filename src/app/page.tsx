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

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);

  useEffect(() => {
    if (isLoading) return;

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
              clearIntent();
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
                subject: {
                  reference: `${authorType}/${authState.userInfo.fhirId}`
                }
              };

              await api.put(
                `/fhir/QuestionnaireResponse/${responseId}`,
                updatedResponse
              );

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
          } finally {
            setIsRedirecting(false);
          }
        };

        handleIntent();
        return;
      }

      if (authState.userInfo?.profile_complete === false && !modalDismissed) {
        setShowProfileModal(true);
      }
    }

    setIsRedirecting(false);
  }, [isLoading, authState, modalDismissed, router]);

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
      {showProfileModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'
          onClick={() => {
            setShowProfileModal(false);
            setModalDismissed(true);
          }}
        >
          <div
            className='w-[90%] max-w-md rounded-xl bg-white p-6 text-center shadow-lg'
            onClick={e => e.stopPropagation()}
          >
            <h2 className='mb-2 text-lg font-semibold'>Profil belum lengkap</h2>
            <p className='mb-4 text-sm text-gray-600'>
              Lengkapi profil Anda untuk mendapatkan pengalaman terbaik.
            </p>
            <button
              className='bg-primary rounded-lg px-4 py-2 text-white'
              onClick={() => router.push('/profile')}
            >
              Lengkapi Sekarang
            </button>
          </div>
        </div>
      )}

      <div className={showProfileModal ? 'pointer-events-none blur-sm' : ''}>
        <NavigationBar />
        <HomeHeader />
        <HomeContent />
      </div>
    </>
  );
};

export default App;
