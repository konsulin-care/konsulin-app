import ScoreDisplay from '@/components/assessment/score-display';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';
import { interpret } from '@/lib/interpretation';
import { DEFAULT_REGISTRY } from '@/lib/interpretation/instruments';
import { getAPI } from '@/services/api';
import {
  RESULT_BRIEF_PLACEHOLDER,
  useQuestionnaireResponse
} from '@/services/api/assessment';
import { getInstrumentCoding } from '@/services/api/questionnaire-info';
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
import { buildInterpretationBrief } from './interpretation-brief';

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
  const tInterpretation = useTranslations('interpretation');

  // Fetch questionnaire title + fee extension for header and Get Report FAB
  const questionnaireId = questionnaireIdOf(
    questionnaireResponse?.questionnaire
  );
  const queryClient = useQueryClient();
  const { data: questionnaire } = useQuery<Questionnaire | null>({
    queryKey: ['questionnaire', questionnaireId, 'title,extension,code'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Questionnaire>(
        `/fhir/Questionnaire/${questionnaireId}?_elements=title,extension,code`
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

  // Result brief: a stored brief wins (older records), then the local engine
  // reading, then nothing at all.
  const computedResultBrief = useMemo<string | null>(() => {
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

    const reading = interpret(
      questionnaireResponse,
      getInstrumentCoding(questionnaire ?? null),
      DEFAULT_REGISTRY
    );
    return buildInterpretationBrief(reading, tInterpretation);
  }, [questionnaire, questionnaireResponse, tInterpretation]);

  return questionnaireResponseIsLoading && !questionnaireResponse ? (
    <div className='flex min-h-[200px] items-center justify-center'>
      <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
    </div>
  ) : (
    <ScoreDisplay
      questionnaireResponse={questionnaireResponse}
      isLoading={questionnaireResponseIsLoading}
      resultBrief={computedResultBrief}
      showBrief={computedResultBrief !== null}
      questionnaireTitle={questionnaireTitle}
    />
  );
}
