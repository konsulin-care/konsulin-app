'use client';

import { useUpdateSubmitQuestionnaire } from '@/services/api/assessment';
import { QuestionnaireResponse } from 'fhir/r4';
import { useEffect } from 'react';

type Props = {
  isAuthenticated: boolean;
  patientId: string;
  questionnaireId: string;
  questionnaireResponse: QuestionnaireResponse;
};

export default function QuestionnaireResubmitter({
  isAuthenticated,
  patientId,
  questionnaireId,
  questionnaireResponse
}: Props) {
  const { mutateAsync: updateQuestionnaireResponse } =
    useUpdateSubmitQuestionnaire(questionnaireId, isAuthenticated);

  useEffect(() => {
    const author = { reference: `Patient/${patientId}` };
    const subject = { reference: `Patient/${patientId}` };
    const payload = { ...questionnaireResponse, author, subject };

    const submitResponse = async () => {
      try {
        await updateQuestionnaireResponse(payload);
        localStorage.removeItem('skip-response-cleanup');
      } catch (error) {
        console.error('Error when updating questionnaire response: ', error);
      }
    };
    submitResponse();
  }, []);

  return null;
}
