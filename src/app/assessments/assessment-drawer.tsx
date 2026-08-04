/* eslint-disable complexity */
/* reason: assessment drawer renders practitioner/patient views with rich sub-sections */
'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import type { ResearchProgress } from '@/utils/fhir/research';
import { customMarkdownComponents } from '@/utils/helper';
import { Questionnaire, ResearchStudy } from 'fhir/r4';
import ReactMarkdown from 'react-markdown';
import QRCode from 'react-qr-code';

interface AssessmentDrawerContentProps {
  selectedAssessment: Questionnaire | ResearchStudy | null;
  researchUrl: string;
  /** True when the study's current batch is fully completed. */
  researchComplete: boolean;
  currentLocation: string;
  isPending: boolean;
  isPractitioner: boolean;
  onClose: () => void;
  startTransition: React.TransitionStartFunction;
  router: { push: (url: string, options?: Record<string, unknown>) => void };
}

/**
 * Derives the research navigation state for a selected ResearchStudy:
 * the first uncompleted questionnaire of the current batch, or a completion
 * flag when the batch is fully done.
 *
 * @param selectedAssessment - The drawer's selected resource.
 * @param progress - Shared research progress, may be undefined while loading.
 * @returns The researchUrl to deep-link to and whether the study is complete.
 */
export function deriveResearchNavigation(
  selectedAssessment: Questionnaire | ResearchStudy | null,
  progress: ResearchProgress | undefined
): { researchUrl: string; researchComplete: boolean } {
  if (selectedAssessment?.resourceType !== 'ResearchStudy') {
    return { researchUrl: '', researchComplete: false };
  }
  const study = progress?.studies.find(
    item => item.study.id === selectedAssessment.id
  );
  const hasCurrentBatch = Boolean(study?.currentBatch);
  const researchUrl = study?.firstUncompletedQuestionnaireId ?? '';
  return {
    researchUrl,
    researchComplete: hasCurrentBatch && !researchUrl
  };
}

/** Description card with brief text rendered as markdown. */
function DescriptionCard({ text }: Readonly<{ text: string }>) {
  return (
    <div className='card mt-4 border-0 bg-[#F9F9F9]'>
      <div className='font-bold'>Brief</div>
      <hr className='my-4 border-black opacity-10' />
      <div className='flex flex-wrap gap-[10px] text-sm'>
        <DrawerDescription>
          <ReactMarkdown components={customMarkdownComponents}>
            {text}
          </ReactMarkdown>
        </DrawerDescription>
      </div>
    </div>
  );
}

/** Assessment detail drawer with QR code, description, and action button. */
export default function AssessmentDrawerContent({
  selectedAssessment,
  researchUrl,
  researchComplete,
  currentLocation,
  isPending,
  isPractitioner,
  startTransition,
  router
}: Readonly<AssessmentDrawerContentProps>) {
  const showBadge =
    selectedAssessment?.resourceType === 'ResearchStudy' &&
    (selectedAssessment.note?.length ?? 0) > 0;

  /** Navigate to the assessment detail, the next batch questionnaire, or the research page. */
  const handleButtonClick = () => {
    if (selectedAssessment?.resourceType === 'ResearchStudy') {
      if (researchComplete) {
        startTransition(() => {
          router.push('/research');
        });
        return;
      }
      if (!researchUrl) return;
      startTransition(() => {
        router.push(`/assessments?id=${researchUrl}`);
      });
      return;
    }
    if (selectedAssessment?.id) {
      startTransition(() => {
        router.push(`/assessments?id=${selectedAssessment.id}`);
      });
    }
  };

  const isButtonDisabled =
    isPending ||
    (selectedAssessment?.resourceType === 'ResearchStudy' &&
      !researchUrl &&
      !researchComplete);

  const buttonText = (() => {
    if (isPractitioner) return 'Isi assessment untuk Pasien';
    if (selectedAssessment?.resourceType === 'ResearchStudy') {
      return researchComplete ? 'View Research' : 'Mulai';
    }
    return 'Start Test';
  })();

  const renderBadge = showBadge && (
    <Badge
      style={{ justifySelf: 'center' }}
      className='bg-secondary flex w-fit rounded-[8px] px-[10px] py-[4px]'
    >
      <div className='text-xs text-white'>
        Estimated time: ~{selectedAssessment?.note?.[0]?.text}
      </div>
    </Badge>
  );

  const renderActionButton = (
    <Button
      onClick={handleButtonClick}
      className='bg-secondary h-full w-full rounded-xl p-4 text-white'
      disabled={isButtonDisabled}
    >
      {isPending ? (
        <LoadingSpinnerIcon
          width={20}
          height={20}
          stroke='white'
          className='w-full animate-spin'
        />
      ) : (
        buttonText
      )}
    </Button>
  );

  const renderCloseButton = (
    <DrawerClose className='focus:ring-opacity-50 items-center justify-center rounded-xl border-transparent bg-transparent p-4 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 focus:outline-none'>
      Close
    </DrawerClose>
  );

  if (isPractitioner) {
    return (
      <div className='flex flex-col'>
        <DrawerHeader className='mx-auto text-[20px] font-bold'>
          {renderBadge}
          <DrawerTitle className='text-center text-2xl'>
            {selectedAssessment?.title}
          </DrawerTitle>
        </DrawerHeader>

        <DrawerDescription>
          <QRCode
            size={150}
            style={{
              height: '290px',
              maxWidth: '100%',
              width: '100%',
              margin: '32px 0'
            }}
            value={currentLocation}
            viewBox='0 0 256 256'
          />
        </DrawerDescription>

        {selectedAssessment && (
          <DrawerFooter className='mt-2 flex flex-col p-0 py-4'>
            {renderActionButton}
            {renderCloseButton}
          </DrawerFooter>
        )}
      </div>
    );
  }

  return (
    <div className='flex flex-col'>
      <DrawerHeader className='mx-auto text-[20px] font-bold'>
        {renderBadge}
        <DrawerTitle className='text-center text-2xl'>
          {selectedAssessment?.title}
        </DrawerTitle>
      </DrawerHeader>
      <DescriptionCard
        text={
          selectedAssessment && 'description' in selectedAssessment
            ? selectedAssessment.description
            : ''
        }
      />

      {selectedAssessment?.resourceType === 'ResearchStudy' && (
        <div>
          <div className='mt-4 font-bold'>Researcher</div>
          {(selectedAssessment.contact ?? []).map((item, index) => (
            <div
              className='card mt-2 border-0 bg-[#F9F9F9] text-sm'
              key={item.name ?? `contact-${index}`}
            >
              {item.name}
            </div>
          ))}
        </div>
      )}

      {selectedAssessment && (
        <DrawerFooter className='mt-2 flex flex-col p-0 py-4'>
          {renderActionButton}
          {renderCloseButton}
        </DrawerFooter>
      )}
    </div>
  );
}
