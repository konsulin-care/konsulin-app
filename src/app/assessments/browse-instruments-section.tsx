'use client';

import CardLoader from '@/components/general/card-loader';
import { BundleEntry, Questionnaire } from 'fhir/r4';
import Image from 'next/image';

interface BrowseInstrumentsSectionProps {
  regularAssessments: BundleEntry<Questionnaire>[];
  regularLoading: boolean;
  isAuthLoading: boolean;
  onAssessmentClick: (assessment: Questionnaire) => void;
}

export default function BrowseInstrumentsSection({
  regularAssessments,
  regularLoading,
  isAuthLoading,
  onAssessmentClick
}: Readonly<BrowseInstrumentsSectionProps>) {
  return (
    <div className='p-4'>
      <div className='text-[14px] font-bold text-[hsla(220,9%,19%,0.6)]'>
        Browse Instruments
      </div>

      {regularLoading || isAuthLoading ? (
        <CardLoader item={4} />
      ) : (
        <div className='mt-4 grid grid-cols-1 gap-2 md:grid-cols-2'>
          {(regularAssessments ?? []).map(
            (assessment: BundleEntry<Questionnaire>) => (
              <button
                key={assessment.resource.id}
                type='button'
                className='card item flex cursor-pointer flex-col p-2 text-left'
                onClick={() => {
                  onAssessmentClick(assessment.resource);
                }}
              >
                <div className='flex items-center'>
                  <div className='mr-2 h-[40px] w-[40px] rounded-full bg-[#F8F8F8] p-2'>
                    <Image
                      className='h-[24px] w-[24px] object-cover'
                      src={'/images/note.svg'}
                      width={24}
                      height={24}
                      alt='note'
                    />
                  </div>
                  <div className='text-[12px] text-[hsla(220,9%,19%,1)]'>
                    {assessment.resource.title}
                  </div>
                </div>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
