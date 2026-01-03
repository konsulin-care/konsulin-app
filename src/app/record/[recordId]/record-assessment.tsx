import ModalQr from '@/components/general/modal-qr';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { getFromLocalStorage } from '@/lib/utils';
import { getAPI } from '@/services/api';
import {
  RESULT_BRIEF_PLACEHOLDER,
  useQuestionnaireResponse
} from '@/services/api/assessment';
import { formatQueryTitle } from '@/utils/helper';
import { saveIntent } from '@/utils/intent-storage';
import { QuestionnaireResponseItem } from 'fhir/r4';
import { LinkIcon, NotepadTextIcon, UsersIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

type Props = {
  recordId: string;
  title: string;
};

type IScore = {
  name: string;
  score: number;
  percentage: number;
};

const BASE_HUE = 170;

const generateRandomColor = (baseHue: number) => {
  const hue = (baseHue + (Math.random() * 20 - 10)) % 360;
  const saturation = 70 + Math.random() * 20;
  const lightness = 45 + Math.random() * 15;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export default function RecordAssessment({ recordId, title }: Props) {
  const router = useRouter();
  const {
    data: questionnaireResponse,
    isLoading: questionnaireResponseIsLoading
  } = useQuestionnaireResponse({ questionnaireId: recordId, enabled: true });
  const [scoreList, setScoreList] = useState([]);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [colorMap, setColorMap] = useState({});
  const [polledResultBrief, setPolledResultBrief] = useState<string | null>(
    null
  );
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    const savedColorMap = getFromLocalStorage('result-table-colors');
    if (savedColorMap) {
      setColorMap(JSON.parse(savedColorMap));
    }
  }, []);

  useEffect(() => {
    if (Object.keys(colorMap).length > 0) {
      localStorage.setItem('result-table-colors', JSON.stringify(colorMap));
    }
  }, [colorMap]);

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

  useEffect(() => {
    const fullUrl = window.location.href;
    setCurrentLocation(fullUrl);
  }, []);

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

        const score = subItem?.answer[0]?.valueInteger;
        const ref = reference?.answer[0]?.valueInteger;

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
  }, [questionnaireResponse]);

  useEffect(() => {
    if (!questionnaireResponse) return;

    const interpretationItem = questionnaireResponse.item.find(
      item => item.linkId === 'interpretation'
    );

    const resultBriefItem = interpretationItem?.item.find(
      subItem => subItem.linkId === 'result-brief'
    );

    const existingResult =
      resultBriefItem?.answer?.[0]?.valueString?.trim() ?? '';

    if (existingResult && existingResult !== RESULT_BRIEF_PLACEHOLDER) {
      setPolledResultBrief(existingResult);
      return;
    }

    const serviceRequestId = localStorage.getItem(`serviceRequest_${recordId}`);

    if (!serviceRequestId) return;

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 3;

    const poll = async () => {
      try {
        const API = await getAPI();
        const res = await API.get(
          `/api/v1/service-request/${serviceRequestId}/result`
        );

        const note = res.data?.data?.note?.trim();

        if (note && !cancelled) {
          setPolledResultBrief(note);

          const updatedInterpretationItem = {
            ...interpretationItem,
            item: [
              ...(interpretationItem?.item ?? []).filter(
                i => i.linkId !== 'result-brief'
              ),
              {
                linkId: 'result-brief',
                answer: [{ valueString: note }]
              }
            ]
          };

          const updatedQR = {
            ...questionnaireResponse,
            item: questionnaireResponse.item.map(item =>
              item.linkId === 'interpretation'
                ? updatedInterpretationItem
                : item
            )
          };

          await API.put(`/fhir/QuestionnaireResponse/${recordId}`, updatedQR);

          localStorage.removeItem(`serviceRequest_${recordId}`);
          return;
        }

        attempts += 1;
        if (attempts < MAX_ATTEMPTS && !cancelled) {
          setTimeout(poll, 1000);
        }
      } catch (err) {
        console.error('[record-assessment] polling error:', err);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [questionnaireResponse, recordId]);

  const getResultBrief = () => {
    if (polledResultBrief) return polledResultBrief;

    const interpretationItem = questionnaireResponse?.item.find(
      item => item.linkId === 'interpretation'
    );

    const resultBriefItem = interpretationItem?.item.find(
      subItem => subItem.linkId === 'result-brief'
    );

    if (!resultBriefItem) {
      return 'The data is still being processed, kindly visit this page later.';
    }

    return (
      resultBriefItem.answer?.[0]?.valueString ??
      'The data is still being processed, kindly visit this page later.'
    );
  };

  return (
    <>
      <div className='mb-4'>
        <div className='text-muted text-[14px] font-bold'>
          Assessment Details
        </div>
        <div className='text-muted text-[10px]'>Assessment - User</div>
      </div>
      {isAuthLoading ? (
        <Skeleton className='!mt-0 h-[60px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      ) : (
        <div className='card !mt-0 mb-4 flex items-center'>
          <UsersIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
          {authState.isAuthenticated && authState.userInfo
            ? authState.userInfo.fullname || authState.userInfo.email
            : 'Guest'}
        </div>
      )}
      <div className='card mb-4 flex items-center'>
        <NotepadTextIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
        {formatQueryTitle(title)}
      </div>

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
            {scoreList &&
              scoreList.map((item: IScore) => {
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

      <div className='mb-4 flex items-center space-x-2 rounded-lg bg-[#F9F9F9] p-4'>
        <LinkIcon />
        <div className='flex grow flex-col'>
          <span className='text-muted text-[10px]'>Test Akses</span>
          <span className='text-[14px] font-bold'>QR Code</span>
        </div>
        <ModalQr value={currentLocation} />
      </div>

      <div className='text-m !mt-auto flex flex-col gap-3'>
        {!authState.isAuthenticated && (
          <Button
            className='bg-softGray h-full w-full rounded-xl p-4 text-black'
            onClick={() => {
              saveIntent('assessmentResult', {
                path: window.location.pathname + window.location.search,
                responseId: recordId
              });
              router.push('/auth');
            }}
          >
            Login/Register
          </Button>
        )}

        <Button className='bg-secondary h-full w-full rounded-xl p-4 text-white'>
          Request Analysis
        </Button>
      </div>
    </>
  );
}
