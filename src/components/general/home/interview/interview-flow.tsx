'use client';

import { useTranslations } from '@/i18n';
import type {
  ChiefComplaint,
  InterviewResult
} from '@/types/recommendation-interview';
import {
  resolveInterviewResult,
  resolveLabel
} from '@/utils/recommendation-interview';
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
  const t = useTranslations('interview');
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
    <div className='fixed inset-x-0 bottom-0 z-40 flex justify-center md:left-[var(--shell-offset,0px)]'>
      <div className='bg-card w-full max-w-md rounded-t-3xl p-5 pb-8 shadow-lg'>
        <div className='mb-2 flex items-center justify-between'>
          <span className='text-muted-foreground text-[12px] font-medium'>
            {resolveLabel(complaint, t)} · {step === 'options' ? '1/2' : '2/2'}
          </span>
          {onClose && (
            <button
              type='button'
              onClick={onClose}
              aria-label={t('close_interview')}
              className='text-muted-foreground text-[12px]'
            >
              ✕
            </button>
          )}
        </div>

        {step === 'options' && (
          <>
            <h2 className='text-foreground mb-4 text-[16px] font-bold'>
              {t('which_describes')}
            </h2>
            <ul className='flex flex-col gap-2'>
              {complaint.options.map(option => (
                <li key={option.id}>
                  <button
                    type='button'
                    onClick={() => {
                      handleOptionSelect(option.id);
                    }}
                    className='border-border bg-card text-charcoal-700 hover:border-turquoise-deep w-full rounded-lg border px-4 py-3 text-left text-[14px]'
                  >
                    {resolveLabel(option, t)}
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
              aria-label={t('back')}
              className='text-muted-foreground mb-3 flex items-center gap-1 text-[12px]'
            >
              <ChevronLeft className='h-3.5 w-3.5' aria-hidden='true' />
              {t('back')}
            </button>
            <h2 className='text-foreground mb-4 text-[16px] font-bold'>
              {resolveLabel(complaint.redFlag, t)}
            </h2>
            <div className='flex flex-col gap-2'>
              <button
                type='button'
                onClick={() => {
                  handleSafetyAnswer(false);
                }}
                className='border-border bg-card text-charcoal-700 hover:border-turquoise-deep w-full rounded-lg border px-4 py-3 text-left text-[14px]'
              >
                {t('safe_answer')}
              </button>
              <button
                type='button'
                onClick={() => {
                  handleSafetyAnswer(true);
                }}
                className='border-warning-deep bg-warning-tint text-warning-deep hover:border-warning-deep w-full rounded-lg border px-4 py-3 text-left text-[14px]'
              >
                {t('flagged_answer')}
              </button>
            </div>

            {flagged && (
              <>
                <EmergencyBanner resources={complaint.redFlag.resources} />
                <button
                  type='button'
                  onClick={finish}
                  className='bg-primary text-primary-foreground mt-4 w-full rounded-full py-3 text-[14px] font-semibold'
                >
                  {t('show_recommendations')}
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
