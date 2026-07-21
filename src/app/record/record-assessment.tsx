import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { STORES, dbDelete, dbGet, dbSet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import {
  RESULT_BRIEF_LOGIN_REQUIRED,
  RESULT_BRIEF_PLACEHOLDER,
  useQuestionnaireResponse
} from '@/services/api/assessment';
import { useQuery } from '@tanstack/react-query';
import {
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireResponseItem
} from 'fhir/r4';
import { NotepadTextIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

type Props = {
  recordId: string;
  onTitleChange?: (title: string) => void;
};

type IScore = {
  name: string;
  score: number;
  percentage: number;
};

const BASE_HUE = 170;

/** Generates a random HSL color based on a base hue. */
const generateRandomColor = (baseHue: number) => {
  const hue = (baseHue + (Math.random() * 20 - 10)) % 360;
  const saturation = 70 + Math.random() * 20;
  const lightness = 45 + Math.random() * 15;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

/**
 *
 */
export default function RecordAssessment({ recordId, onTitleChange }: Props) {
  const {
    data: questionnaireResponseRaw,
    isLoading: questionnaireResponseIsLoading
  } = useQuestionnaireResponse({
    questionnaireId: recordId,
    enabled: true
  });
  const questionnaireResponse =
    questionnaireResponseRaw as unknown as QuestionnaireResponse | null;
  const [scoreList, setScoreList] = useState<IScore[]>([]);
  const [colorMap, setColorMap] = useState<Record<string, string>>({});
  const [polledResultBrief, setPolledResultBrief] = useState<string | null>(
    null
  );
  const { state: authState } = useAuth();

  useEffect(() => {
    const ownerId = authState.userInfo.userId || 'guest';
    dbGet<{ value: Record<string, string> }>(STORES.uiPreferences, [
      ownerId,
      'result-table-colors'
    ])
      .then(saved => {
        if (saved?.value) {
          setColorMap(saved.value);
        }
        return saved;
      })
      .catch((err: unknown) => console.warn('[IndexedDB]', err));
  }, [authState.userInfo.userId]);

  useEffect(() => {
    if (Object.keys(colorMap).length > 0) {
      const ownerId = authState.userInfo.userId || 'guest';
      dbSet(STORES.uiPreferences, {
        ownerId,
        prefKey: 'result-table-colors',
        value: colorMap
      }).catch((err: unknown) => console.warn('[IndexedDB]', err));
    }
  }, [colorMap, authState.userInfo.userId]);

  const getColor = (name: string) => {
    // check if the color for this item is already saved
    if (colorMap[name]) {
      return colorMap[name];
    }

    // otherwise, generate a new color for the item and save it
    const randomColor = generateRandomColor(BASE_HUE);
    setColorMap(prevMap => ({
      ...prevMap,
      [name]: randomColor
    }));

    return randomColor;
  };

  /** Extracts and calculates score data from questionnaire response. */
  const scoreData = () => {
    if (!questionnaireResponse) return;

    const interpretationItem = questionnaireResponse.item.find(
      (item: QuestionnaireResponseItem) => item.linkId === 'interpretation'
    );

    const scoreDimensionItem = interpretationItem?.item.find(
      (subItem: QuestionnaireResponseItem) =>
        subItem.linkId === 'score-dimension'
    );

    const reference = scoreDimensionItem?.item.find(
      (subItem: QuestionnaireResponseItem) => subItem.linkId === 'reference'
    );

    const result = scoreDimensionItem?.item
      .map((subItem: QuestionnaireResponseItem) => {
        if (subItem.linkId === 'reference') return null;

        const score = subItem.answer?.[0]?.valueInteger;
        const ref = reference?.answer?.[0]?.valueInteger;

        if (score && ref) {
          const newScore = score / ref;
          const percentage = Math.round(newScore * 100);

          return {
            name: subItem.text ?? 'Score',
            score: newScore,
            percentage
          };
        }
        return null;
      })
      .filter(Boolean);

    setScoreList(result || []);
  };

  useEffect(() => {
    if (questionnaireResponse) {
      scoreData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionnaireResponse]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 3;

    /** Polls the backend for result brief data. */
    const poll = async (serviceRequestId: string) => {
      try {
        const API = await getAPI();
        const res = await API.get<{ data: { note?: string } }>(
          `/api/v1/service-request/${serviceRequestId}/result`
        );

        const note: string | undefined = res.data?.data?.note?.trim();

        if (note && !cancelled) {
          if (!authState.isAuthenticated) return;
          setPolledResultBrief(note);

          const interpretationItem = questionnaireResponse.item.find(
            (item: QuestionnaireResponseItem) =>
              item.linkId === 'interpretation'
          );

          const updatedInterpretationItem = {
            ...interpretationItem,
            item: [
              ...(interpretationItem?.item ?? []).filter(
                (i: QuestionnaireResponseItem) => i.linkId !== 'result-brief'
              ),
              {
                linkId: 'result-brief',
                answer: [{ valueString: note }]
              }
            ]
          };

          const updatedQR = {
            ...questionnaireResponse,
            item: questionnaireResponse.item.map(
              (item: QuestionnaireResponseItem) =>
                item.linkId === 'interpretation'
                  ? updatedInterpretationItem
                  : item
            )
          };

          await API.put(`/fhir/QuestionnaireResponse/${recordId}`, updatedQR);

          dbDelete(STORES.serviceRequests, recordId).catch((err: unknown) =>
            console.warn('[IndexedDB]', err)
          );
          return;
        }

        attempts += 1;
        if (attempts < MAX_ATTEMPTS && !cancelled) {
          setTimeout(() => {
            poll(serviceRequestId).catch(console.error);
          }, 1000);
        }
      } catch (err) {
        console.error('[record-assessment] polling error:', err);
      }
    };

    /** Polls for the result brief from the backend service request. */
    /** Polls for the result brief from the backend service request. */
    const start = async () => {
      if (!questionnaireResponse) return;
      if (!authState.isAuthenticated) return;

      const interpretationItem = questionnaireResponse.item.find(
        (item: QuestionnaireResponseItem) => item.linkId === 'interpretation'
      );

      const resultBriefItem = interpretationItem?.item.find(
        (subItem: QuestionnaireResponseItem) =>
          subItem.linkId === 'result-brief'
      );

      const existingResult =
        resultBriefItem?.answer?.[0]?.valueString?.trim() ?? '';

      if (existingResult && existingResult !== RESULT_BRIEF_PLACEHOLDER) {
        setPolledResultBrief(existingResult);
        return;
      }

      const srRecord = await dbGet<{ serviceRequestId: string }>(
        STORES.serviceRequests,
        recordId
      );
      const serviceRequestId = srRecord?.serviceRequestId;
      if (!serviceRequestId) return;

      poll(serviceRequestId).catch(console.error);
    };

    start().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [questionnaireResponse, recordId, authState.isAuthenticated]);

  // Fetch questionnaire title for page header and display
  const questionnaireId = questionnaireResponse?.questionnaire?.split('/')[1];
  const { data: questionnaireTitle } = useQuery<string | undefined>({
    queryKey: ['questionnaire', questionnaireId, 'title'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Questionnaire>(
        `/fhir/Questionnaire/${questionnaireId}?_elements=title`
      );
      return response.data.title ?? questionnaireId;
    },
    enabled: Boolean(questionnaireId)
  });

  // Push the resolved title up to RecordDetail
  useEffect(() => {
    if (questionnaireTitle && onTitleChange) {
      onTitleChange(questionnaireTitle);
    }
  }, [questionnaireTitle, onTitleChange]);

  const getResultBrief = () => {
    // Guest users: no webhook, no polling, no PUT
    if (!authState.isAuthenticated) {
      return RESULT_BRIEF_LOGIN_REQUIRED;
    }

    // If we already polled a final result, use it
    if (polledResultBrief) return polledResultBrief;

    // Otherwise, check persisted QuestionnaireResponse
    const interpretationItem = questionnaireResponse?.item.find(
      (item: QuestionnaireResponseItem) => item.linkId === 'interpretation'
    );

    const resultBriefItem = interpretationItem?.item.find(
      (subItem: QuestionnaireResponseItem) => subItem.linkId === 'result-brief'
    );

    // No result yet → placeholder
    if (!resultBriefItem) {
      return RESULT_BRIEF_PLACEHOLDER;
    }

    return resultBriefItem.answer?.[0]?.valueString ?? RESULT_BRIEF_PLACEHOLDER;
  };

  return (
    <>
      {questionnaireResponse?.questionnaire && (
        <div className='card mb-4 flex items-center'>
          <NotepadTextIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
          {questionnaireTitle ??
            questionnaireResponse.questionnaire.split('/')[1] ??
            ''}
        </div>
      )}

      <div className='mb-4'>
        <div className='text-12 text-muted mb-2'>Result Brief</div>

        {questionnaireResponseIsLoading ? (
          <Skeleton className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
        ) : (
          <div className='card'>
            <ReactMarkdown>
              {questionnaireResponse && getResultBrief()}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <div className='mb-4'>
        <div className='text-12 text-muted mb-2'>Result Tables</div>

        {questionnaireResponseIsLoading ? (
          <Skeleton className='h-[50px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
        ) : (
          <div className='space-y-2 rounded-lg bg-[#F9F9F9] p-4'>
            {scoreList?.map((item: IScore) => {
              const randomColor = getColor(item.name);
              return (
                <div
                  key={item.name}
                  className='grid grid-cols-[170px_1fr_30px] items-center gap-3'
                >
                  <span className='text-wrap break-words'>{item.name}</span>
                  <Progress value={item.score} color={randomColor} />
                  <span className='text-sm'>{item.percentage}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
