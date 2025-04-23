import ModalQr from '@/components/general/modal-qr';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { useQuestionnaireResponse } from '@/services/api/assessment';
import { QuestionnaireResponseItem } from 'fhir/r4';
import { LinkIcon, NotepadTextIcon, UsersIcon } from 'lucide-react';
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
  const {
    data: questionnaireResponse,
    isLoading: questionnaireResponseIsLoading
  } = useQuestionnaireResponse(recordId);
  const [scoreList, setScoreList] = useState([]);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [colorMap, setColorMap] = useState({});
  const { state: authState } = useAuth();

  useEffect(() => {
    const savedColorMap = localStorage.getItem('result-table-colors');
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

  const getResultBrief = () => {
    const interpretationItem = questionnaireResponse.item.find(
      (item: QuestionnaireResponseItem) => item.linkId === 'interpretation'
    );

    const resultBriefItem = interpretationItem?.item.find(
      (subItem: QuestionnaireResponseItem) => subItem.linkId === 'result-brief'
    );

    const resultBrief = resultBriefItem?.answer[0].valueString;
    return resultBrief;
  };

  return (
    <>
      <div className='mb-4'>
        <div className='text-[14px] font-bold text-muted'>
          Assessment Details
        </div>
        <div className='text-[10px] text-muted'>Assessment - User</div>
      </div>
      <div className='card mb-4 flex items-center'>
        {/* TODO: implement anonymous user */}
        <UsersIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
        Guest
      </div>
      <div className='card mb-4 flex items-center'>
        <NotepadTextIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
        {title}
      </div>

      <div className='mb-4'>
        <div className='text-12 mb-2 text-muted'>Result Brief</div>
        <div className='card'>
          {questionnaireResponseIsLoading ? (
            <div className='flex flex-col gap-3'>
              <Skeleton count={3} className='h-[15px] w-full' />
            </div>
          ) : (
            <ReactMarkdown>
              {questionnaireResponse && getResultBrief()}
            </ReactMarkdown>
          )}
        </div>
      </div>

      <div className='mb-4'>
        <div className='text-12 mb-2 text-muted'>Result Tables</div>
        <div className='space-y-2 rounded-lg bg-[#F9F9F9] p-4'>
          {questionnaireResponseIsLoading || !scoreList ? (
            <div className='flex flex-col gap-3'>
              <Skeleton count={2} className='h-[15px] w-full' />
            </div>
          ) : (
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
            })
          )}
        </div>
      </div>

      <div className='mb-4 flex items-center space-x-2 rounded-lg bg-[#F9F9F9] p-4'>
        <LinkIcon />
        <div className='flex grow flex-col'>
          <span className='text-[10px] text-muted'>Test Akses</span>
          <span className='text-[14px] font-bold'>QR Code</span>
        </div>
        <ModalQr value={currentLocation} />
      </div>

      {/* NOTE: the implementation might change once auth is done */}
      <div className='text-m flex flex-col gap-3'>
        {!authState.isAuthenticated && (
          <Button className='h-full w-full rounded-xl bg-softGray p-4 text-black'>
            Login/Register
          </Button>
        )}

        <Button className='h-full w-full rounded-xl bg-secondary p-4 text-white'>
          Request Analysis
        </Button>
      </div>
    </>
  );
}
