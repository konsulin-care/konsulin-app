import ScoreDisplay from '@/components/assessment/score-display';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import {
  RESULT_BRIEF_PLACEHOLDER,
  useQuestionnaireResponse
} from '@/services/api/assessment';
import { getFee } from '@/utils/fhir/fee';
import {
  questionnaireIdLabel,
  questionnaireIdOf
} from '@/utils/fhir/questionnaire-url';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Money,
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireResponseItem
} from 'fhir/r4';
import { useEffect, useMemo } from 'react';
import { useAssessmentPolling } from './hooks/useAssessmentPolling';

type Props = {
  readonly recordId: string;
  readonly onTitleChange?: (title: string) => void;
  readonly onFeeChange?: (fee: Money | null) => void;
};

/**
 * Renders assessment results with score computation, interpretation
 * branching, and FHIR QuestionnaireResponse mapping.
 */
export default function RecordAssessment({
  recordId,
  onTitleChange,
  onFeeChange
}: Props) {
  const {
    data: questionnaireResponseRaw,
    isLoading: questionnaireResponseIsLoading
  } = useQuestionnaireResponse({
    questionnaireId: recordId,
    enabled: true
  });
  const questionnaireResponse =
    questionnaireResponseRaw as unknown as QuestionnaireResponse | null;
  const { state: authState } = useAuth();

  const { polledResultBrief } = useAssessmentPolling({
    recordId,
    questionnaireResponse,
    isAuthenticated: authState.isAuthenticated
  });

  // Fetch questionnaire title + fee extension for header and Get Report FAB
  const questionnaireId = questionnaireIdOf(
    questionnaireResponse?.questionnaire
  );
  const queryClient = useQueryClient();
  const { data: questionnaire } = useQuery<Questionnaire | null>({
    queryKey: ['questionnaire', questionnaireId, 'title,extension'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Questionnaire>(
        `/fhir/Questionnaire/${questionnaireId}?_elements=title,extension`
      );
      return response.data ?? null;
    },
    enabled: Boolean(questionnaireId)
  });
  const questionnaireTitle =
    questionnaire?.title ??
    (questionnaireId ? questionnaireIdLabel(questionnaireId) : '');
  const fee = useMemo(
    () => (questionnaire ? getFee(questionnaire) : null),
    [questionnaire]
  );

  // Push the resolved title up to RecordDetail
  useEffect(() => {
    if (questionnaireTitle && onTitleChange) {
      onTitleChange(questionnaireTitle);
    }
  }, [questionnaireTitle, onTitleChange]);

  // Seed the shared title cache so other surfaces show the same string
  useEffect(() => {
    if (questionnaireId && questionnaire?.title) {
      queryClient.setQueryData(
        ['questionnaire', questionnaireId, 'title'],
        questionnaire.title
      );
    }
  }, [questionnaireId, questionnaire?.title, queryClient]);

  // Push the questionnaire fee up to RecordDetail; reset on unmount
  useEffect(() => {
    onFeeChange?.(fee);
    return () => onFeeChange?.(null);
  }, [fee, onFeeChange]);

  // Compute the result brief
  const computedResultBrief = useMemo<string | null>(() => {
    if (!authState.isAuthenticated) return null;
    if (polledResultBrief) return polledResultBrief;

    // Check for existing result brief in the QR data
    const interpretationItem = questionnaireResponse?.item.find(
      (item: QuestionnaireResponseItem) => item.linkId === 'interpretation'
    );
    const resultBriefItem = interpretationItem?.item.find(
      (subItem: QuestionnaireResponseItem) => subItem.linkId === 'result-brief'
    );
    const existingBrief =
      resultBriefItem?.answer?.[0]?.valueString?.trim() ?? '';

    if (existingBrief && existingBrief !== RESULT_BRIEF_PLACEHOLDER) {
      return existingBrief;
    }

    return null;
  }, [authState.isAuthenticated, polledResultBrief, questionnaireResponse]);

  return questionnaireResponseIsLoading && !questionnaireResponse ? (
    <div className='flex min-h-[200px] items-center justify-center'>
      <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
    </div>
  ) : (
    <ScoreDisplay
      questionnaireResponse={questionnaireResponse}
      isLoading={questionnaireResponseIsLoading}
      resultBrief={computedResultBrief}
      questionnaireTitle={questionnaireTitle}
    />
  );
}
