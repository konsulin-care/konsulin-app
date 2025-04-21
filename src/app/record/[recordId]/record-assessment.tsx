import ModalQr from '@/components/general/modal-qr';
import { Progress } from '@/components/ui/progress';
import { useQuestionnaireResponse } from '@/services/api/assessment';
import { QuestionnaireResponseItem } from 'fhir/r4';
import { LinkIcon, NotepadTextIcon, UsersIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = {
  recordId: string;
  title: string;
};

type IScore = {
  name: string;
  score: number;
};

export default function RecordAssessment({ recordId, title }: Props) {
  const { data: questionnaireResponse } = useQuestionnaireResponse(recordId);
  const [scoreList, setScoreList] = useState([]);

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

          return {
            name: subItem.text,
            score: newScore
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
        <div className='card'>{questionnaireResponse && getResultBrief()}</div>
      </div>

      <div className='mb-4'>
        <div className='text-12 mb-2 text-muted'>Result Tables</div>
        <div className='space-y-2 rounded-lg bg-[#F9F9F9] p-4'>
          {scoreList &&
            scoreList.map((item: IScore) => (
              <div key={item.name} className='flex w-full items-center gap-3'>
                <span className='text-nowrap'>{item.name}</span>
                <Progress value={item.score} />
              </div>
            ))}
        </div>
      </div>

      <div className='flex items-center space-x-2 rounded-lg bg-[#F9F9F9] p-4'>
        <LinkIcon />
        <div className='flex grow flex-col'>
          <span className='text-[10px] text-muted'>Test Akses</span>
          <span className='text-[14px] font-bold'>QR Code</span>
        </div>
        <ModalQr value={recordId} />
      </div>
    </>
  );
}
