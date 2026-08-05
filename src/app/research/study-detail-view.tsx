'use client';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle
} from '@/components/ui/drawer';
import { useShareStudy } from '@/hooks/useShareStudy';
import type { StudyProgress } from '@/utils/fhir/research';
import { FlaskConical, Share2 } from 'lucide-react';
import {
  BatchProgress,
  QuestionnaireList,
  TimelineStrip
} from './study-sections';

interface StudyDetailViewProps {
  progress: StudyProgress | null;
  overlapMap: Map<string, string[]>;
  open: boolean;
  onClose: () => void;
  onParticipate: (progress: StudyProgress) => void;
  onQuestionnaireClick: (studyId: string, questionnaireId: string) => void;
  isPatient: boolean;
  fhirId?: string;
  /** Resolved id → questionnaire title map. */
  titleMap?: Readonly<Record<string, string>>;
  /** True while questionnaire titles are being fetched. */
  isTitlesLoading?: boolean;
}

/**
 * Full-viewport study detail drawer opened by tapping a carousel card.
 *
 * Shows the untruncated description, batch progress, batch timeline, and the
 * full questionnaire list with a sticky Participate CTA at the footer.
 */
export default function StudyDetailView({
  progress,
  overlapMap,
  open,
  onClose,
  onParticipate,
  onQuestionnaireClick,
  isPatient,
  fhirId,
  titleMap,
  isTitlesLoading
}: Readonly<StudyDetailViewProps>) {
  const { handleShare, copied } = useShareStudy({
    studyId: progress?.study.id ?? '',
    isPatient,
    fhirId
  });

  return (
    <Drawer
      open={open}
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      <DrawerContent className='h-[100dvh] max-h-[100dvh]'>
        {progress && (
          <div className='flex h-full flex-col'>
            <div className='flex-1 overflow-y-auto px-4 pb-4'>
              <div className='pt-6'>
                <DrawerTitle className='flex items-center gap-2 text-left'>
                  <FlaskConical className='h-5 w-5 shrink-0 text-black' />
                  {progress.study.title}
                </DrawerTitle>
                <DrawerDescription className='mt-2 text-left text-gray-600'>
                  {progress.study.description}
                </DrawerDescription>
              </div>
              <div className='mt-4 flex flex-col gap-4'>
                <BatchProgress progress={progress} />
                {progress.isComplete && (
                  <div className='rounded-xl bg-green-50 px-4 py-2 text-center text-xs font-bold text-green-700'>
                    You&apos;ve completed this batch. Next batch opens soon!
                  </div>
                )}
                <TimelineStrip progress={progress} />
                <QuestionnaireList
                  progress={progress}
                  overlapMap={overlapMap}
                  onQuestionnaireClick={onQuestionnaireClick}
                  titleMap={titleMap}
                  isTitlesLoading={isTitlesLoading}
                  showOverlapHints={true}
                />
                <button
                  type='button'
                  data-testid={`research-share-${progress.study.id}`}
                  onClick={() => {
                    void handleShare();
                  }}
                  className='flex cursor-pointer items-center justify-center gap-1.5 border-t border-gray-100 pt-3 text-center text-[10px] text-black'
                >
                  <Share2 className='h-3 w-3' />
                  {copied ? 'Link copied!' : 'Tap to share this study'}
                </button>
              </div>
            </div>
            <div className='border-t p-4'>
              <Button
                type='button'
                variant='secondary'
                className='w-full text-white'
                onClick={() => onParticipate(progress)}
              >
                Participate
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
