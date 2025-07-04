import { useUpdateSubmitQuestionnaire } from '@/services/api/assessment';
import { useQueryClient } from '@tanstack/react-query';
import { QuestionnaireResponse } from 'fhir/r4';
import { useEffect } from 'react';
import { LoadingSpinnerIcon } from '../icons';

type Props = {
  isAuthenticated: boolean;
  patientId: string;
  questionnaireId: string;
  questionnaireResponse: QuestionnaireResponse;
  onDone: () => void;
};

export default function QuestionnaireResubmitter({
  isAuthenticated,
  patientId,
  questionnaireId,
  questionnaireResponse,
  onDone
}: Props) {
  const queryClient = useQueryClient();
  const { mutateAsync: updateQuestionnaireResponse } =
    useUpdateSubmitQuestionnaire(questionnaireId, isAuthenticated);

  useEffect(() => {
    const author = { reference: `Patient/${patientId}` };
    const subject = { reference: `Patient/${patientId}` };
    const payload = { ...questionnaireResponse, author, subject };

    const submitResponse = async () => {
      try {
        await updateQuestionnaireResponse(payload);

        // invalidate patient records query so dashboard refetches
        await queryClient.refetchQueries(['patient-records', patientId]);
        localStorage.removeItem('skip-response-cleanup');
      } catch (error) {
        console.error('Error when updating questionnaire response: ', error);
      } finally {
        onDone();
      }
    };
    submitResponse();
  }, []);

  return (
    <div className='flex min-h-screen min-w-full items-center justify-center'>
      <LoadingSpinnerIcon
        width={56}
        height={56}
        className='w-full animate-spin'
      />
    </div>
  );
}
