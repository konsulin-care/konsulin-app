'use client';

import type {
  ChiefComplaint,
  InterviewResult
} from '@/types/recommendation-interview';
import { resolveInterviewResult } from '@/utils/recommendation-interview';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { EmergencyBanner } from './emergency-banner';

interface InterviewFlowProps {
  /** Renders nothing when false (drawer is controlled by the parent). */
  open?: boolean;
  /** The chief complaint selected from the search entry. */
  complaint: ChiefComplaint;
  /** Emits the deterministic result once the interview resolves. */
  onComplete: (result: InterviewResult) => void;
  /** Optional dismiss handler; renders a close button when provided. */
  onClose?: () => void;
}

type Step = 'options' | 'redflag';

/**
 * Stepped smart interview: one question per screen.
 *
 * Screen 1 presents the chief-complaint's symptom-focus options (at most
 * seven). Screen 2 asks the red-flag safety check; a positive answer only
 * nudges with the emergency banner and never blocks completing.
 *
 * @param props.open - Controls visibility (drawer-shell handled by parent)
 * @param props.complaint - Selected chief complaint to walk through
 * @param props.onComplete - Emits the resolved recommendation intent
 * @param props.onClose - Optional dismiss handler for the drawer
 */
export function InterviewFlow({
  open = true,
  complaint,
  onComplete,
  onClose
}: Readonly<InterviewFlowProps>) {
  const [step, setStep] = useState<Step>('options');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);

  if (!open) return null;

  const handleOptionSelect = (optionId: string) => {
    // skipcq: JS-D1001 — self-explanatory handler
    setSelectedOptionId(optionId);
    setStep('redflag');
  };

  const finish = () => {
    // skipcq: JS-D1001 — self-explanatory handler
    const result = resolveInterviewResult(complaint.id, selectedOptionId);
    if (result) onComplete(result);
  };

  const handleSafetyAnswer = (positive: boolean) => {
    // skipcq: JS-D1001 — self-explanatory handler
    setFlagged(positive);
    if (!positive) finish();
  };

  return (
    <div className='fixed inset-x-0 bottom-0 z-40 flex justify-center'>
      <div className='w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-lg'>
        <div className='mb-2 flex items-center justify-between'>
          <span className='text-[12px] font-medium text-gray-400'>
            {complaint.label} · {step === 'options' ? '1/2' : '2/2'}
          </span>
          {onClose && (
            <button
              type='button'
              onClick={onClose}
              aria-label='Close interview'
              className='text-[12px] text-gray-400'
            >
              ✕
            </button>
          )}
        </div>

        {step === 'options' && (
          <>
            <h2 className='mb-4 text-[16px] font-bold text-gray-900'>
              Which best describes your concern?
            </h2>
            <ul className='flex flex-col gap-2'>
              {complaint.options.map(option => (
                <li key={option.id}>
                  <button
                    type='button'
                    onClick={() => {
                      handleOptionSelect(option.id);
                    }}
                    className='w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-[14px] text-gray-800 hover:border-[var(--secondary)]'
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 'redflag' && (
          <>
            <button
              type='button'
              onClick={() => {
                setStep('options');
              }}
              aria-label='Back'
              className='mb-3 flex items-center gap-1 text-[12px] text-gray-500'
            >
              <ChevronLeft className='h-3.5 w-3.5' aria-hidden='true' />
              Back
            </button>
            <h2 className='mb-4 text-[16px] font-bold text-gray-900'>
              {complaint.redFlag.label}
            </h2>
            <div className='flex flex-col gap-2'>
              <button
                type='button'
                onClick={() => {
                  handleSafetyAnswer(false);
                }}
                className='w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-[14px] text-gray-800 hover:border-[var(--secondary)]'
              >
                No, I&apos;m safe
              </button>
              <button
                type='button'
                onClick={() => {
                  handleSafetyAnswer(true);
                }}
                className='w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left text-[14px] text-amber-900 hover:border-amber-400'
              >
                Yes, that&apos;s me
              </button>
            </div>

            {flagged && (
              <>
                <EmergencyBanner resources={complaint.redFlag.resources} />
                <button
                  type='button'
                  onClick={finish}
                  className='mt-4 w-full rounded-full bg-[var(--secondary)] py-3 text-[14px] font-semibold text-white'
                >
                  Show me recommendations
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default InterviewFlow;
