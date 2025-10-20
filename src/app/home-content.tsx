'use client';

import ContentWraper from '@/components/general/content-wraper';
import QuestionnaireResubmitter from '@/components/general/questionnaire-resubmitter';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { getFromLocalStorage } from '@/lib/utils';
import { QuestionnaireResponse } from 'fhir/r4';
import { useEffect, useState } from 'react';
import HomeContentClinician from './home-content-clinician';
import HomeContentGuest from './home-content-guest';
import HomeContentPatient from './home-content-patient';

export default function HomeContent() {
  const { state: authState } = useAuth();
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const [responseData, setResponseData] =
    useState<QuestionnaireResponse | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const keys = Object.keys(localStorage);
    const responseKey = keys.find(key => key.startsWith('response_'));

    if (!responseKey) {
      localStorage.removeItem('skip-response-cleanup');
      setQuestionnaireId(null);
      setResponseData(null);
      return;
    }

    setQuestionnaireId(responseKey.replace('response_', ''));
    const stored = getFromLocalStorage(responseKey);
    if (stored) {
      setResponseData(JSON.parse(stored));
    }
  }, []);

  const handleDone = () => {
    setResponseData(null);
    setHasSubmitted(true);
  };

  if (
    responseData &&
    authState.userInfo.role_name !== 'guest' &&
    !hasSubmitted
  ) {
    return (
      <QuestionnaireResubmitter
        isAuthenticated={authState.isAuthenticated}
        patientId={authState.userInfo.fhirId}
        questionnaireId={questionnaireId}
        questionnaireResponse={responseData}
        onDone={handleDone}
      />
    );
  }

  return (
    <ContentWraper>
      {authState.userInfo.role_name === Roles.Guest && <HomeContentGuest />}
      {authState.userInfo.role_name === Roles.Patient && <HomeContentPatient />}
      {authState.userInfo.role_name === Roles.Practitioner && (
        <HomeContentClinician />
      )}
    </ContentWraper>
  );
}
