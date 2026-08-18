'use client';

import type {
  ChiefComplaint,
  InterviewResult
} from '@/types/recommendation-interview';
import { resolveInterviewResult } from '@/utils/recommendation-interview';
import { Lock, Pencil } from 'lucide-react';
import { useCallback, useState } from 'react';
import { ChiefComplaintCombobox } from './chief-complaint-combobox';

interface InterviewAccordionProps {
  /** Chief complaints available for selection. */
  options: readonly ChiefComplaint[];
  /** Called with the resolved result once both steps are complete. */
  onComplete: (result: InterviewResult) => void;
}

/**
 * 2-step sequential accordion for the screening interview.
 *
 * Step 1: Chief concern selection via combobox + quick chips.
 * Step 2: Specific symptom-focus option selection.
 *
 * Completed steps show a Pencil icon to re-edit. Step 2 is locked
 * until Step 1 is selected. No close button — dismissal is handled
 * by the parent drawer (outside click / drag).
 */
export function InterviewAccordion({
  options,
  onComplete
}: Readonly<InterviewAccordionProps>) {
  const [complaint, setComplaint] = useState<ChiefComplaint | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<1 | 2>(1);

  const step1Complete = complaint !== null;
  const step2Complete = selectedOptionId !== null;

  /** Select a complaint and auto-advance to step 2. */
  const handleComplaintSelect = useCallback((c: ChiefComplaint) => {
    setComplaint(c);
    setSelectedOptionId(null);
    setActiveStep(2);
  }, []);

  /** Select a symptom option and emit the result. */
  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (!complaint) return;
      setSelectedOptionId(optionId);
      const result = resolveInterviewResult(complaint.id, optionId);
      if (result) onComplete(result);
    },
    [complaint, onComplete]
  );

  /** Reopen step 1 and reset step 2. */
  const handleEditStep1 = useCallback(() => {
    setActiveStep(1);
    setSelectedOptionId(null);
  }, []);

  return (
    <div className='flex h-full flex-col gap-3 px-4 pb-4'>
      {/* Step 1 — Chief Concern */}
      <div className='rounded-xl border border-gray-200'>
        <button
          type='button'
          onClick={step1Complete ? handleEditStep1 : undefined}
          className='flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left text-sm font-medium'
          disabled={!step1Complete}
        >
          <div className='flex items-center gap-2'>
            <span className='flex h-6 w-6 items-center justify-center rounded-full bg-[var(--secondary)] text-xs font-bold text-white'>
              1
            </span>
            Chief Concern
          </div>
          {step1Complete ? (
            <div className='flex items-center gap-2'>
              <span className='text-xs text-gray-500'>{complaint?.label}</span>
              <Pencil
                data-testid='step-1-edit'
                className='h-4 w-4 text-gray-400'
              />
            </div>
          ) : null}
        </button>
        {activeStep === 1 && (
          <div className='border-t border-gray-100 px-4 pt-3 pb-4'>
            <ChiefComplaintCombobox
              options={options}
              value={complaint}
              onSelect={handleComplaintSelect}
            />
          </div>
        )}
      </div>

      {/* Step 2 — Specific Focus */}
      <div className='rounded-xl border border-gray-200'>
        <div className='flex items-center justify-between px-4 py-3'>
          <div className='flex items-center gap-2'>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step2Complete
                  ? 'bg-[var(--secondary)] text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              2
            </span>
            Specific Focus
          </div>
          {!step1Complete && (
            <Lock data-testid='step-2-lock' className='h-4 w-4 text-gray-400' />
          )}
          {step2Complete && complaint && (
            <div className='flex items-center gap-2'>
              <span className='text-xs text-gray-500'>
                {complaint.options.find(o => o.id === selectedOptionId)?.label}
              </span>
              <Pencil
                data-testid='step-2-edit'
                className='h-4 w-4 text-gray-400'
              />
            </div>
          )}
        </div>
        {activeStep === 2 && step1Complete && complaint && (
          <div className='border-t border-gray-100 px-4 pt-3 pb-4'>
            <p className='mb-3 text-sm font-medium text-gray-700'>
              Which best describes your concern?
            </p>
            <ul className='flex flex-1 flex-col gap-2 overflow-y-auto'>
              {complaint.options.map(option => (
                <li key={option.id}>
                  <button
                    type='button'
                    onClick={() => handleOptionSelect(option.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm ${
                      selectedOptionId === option.id
                        ? 'border-[var(--secondary)] bg-[var(--secondary)]/5 text-[var(--secondary)]'
                        : 'border-gray-200 bg-white text-gray-800 hover:border-[var(--secondary)]'
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default InterviewAccordion;
