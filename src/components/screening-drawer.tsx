'use client';

import { InterviewAccordion } from '@/components/general/home/interview/interview-accordion';
import AppDrawer from '@/components/ui/app-drawer';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { InterviewResult } from '@/types/recommendation-interview';
import {
  getAllChiefComplaints,
  saveLastInterviewResult
} from '@/utils/recommendation-interview';
import { ShieldPlus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

interface ScreeningDrawerProps {
  /** Controls drawer visibility (controlled by the parent). */
  open: boolean;
  /** Dismisses the drawer; also fires after a completed screening. */
  onClose: () => void;
  /** Emits the persisted result on completion (e.g. homepage refresh). */
  onComplete?: (result: InterviewResult, lat?: number, lon?: number) => void;
}

/**
 * Unified screening bottom-sheet shared by the FAB and both home views.
 *
 * Wraps the generic `AppDrawer` with a 2-step sequential accordion:
 * chief concern selection → symptom-focus option. On completion it persists
 * the result to IndexedDB, emits it to the parent, closes, and routes to
 * `/recommendation` when the user is not already on the homepage.
 */
export default function ScreeningDrawer({
  open,
  onClose,
  onComplete
}: Readonly<ScreeningDrawerProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const allComplaints = useMemo(() => getAllChiefComplaints(), []);
  const [pendingResult, setPendingResult] = useState<InterviewResult | null>(
    null
  );
  const geolocation = useGeolocation();

  /** Persists the result, emits it, then routes off-page when needed. */
  const handleSubmit = useCallback(
    (result: InterviewResult, lat?: number, lon?: number) => {
      void saveLastInterviewResult(result);
      onComplete?.(result, lat, lon);
      onClose();
      setPendingResult(null);
      // Homepage renders the stack inline; elsewhere go to results (unless
      // already there, which would restart the page).
      if (pathname !== '/' && pathname !== '/recommendation') {
        router.push('/recommendation');
      }
    },
    [onComplete, onClose, pathname, router]
  );

  /** Closes the drawer and resets state. */
  const handleClose = useCallback(() => {
    setPendingResult(null);
    onClose();
  }, [onClose]);

  /** Called by InterviewAccordion when both steps are complete. */
  const handleAccordionComplete = useCallback((result: InterviewResult) => {
    setPendingResult(result);
  }, []);

  /** Primary CTA click — requests geolocation then submits. */
  const handleCtaClick = useCallback(() => {
    if (!pendingResult) return;

    // Request geolocation, then submit with or without coords
    geolocation.request();

    // Wait for geolocation result (max 3s), then submit
    const checkGeo = () => {
      if (geolocation.loading) {
        // Still loading, wait a bit more
        setTimeout(checkGeo, 100);
        return;
      }

      if (geolocation.lat !== null && geolocation.lon !== null) {
        // Success: submit with coords
        handleSubmit(pendingResult, geolocation.lat, geolocation.lon);
      } else {
        // Error or timeout: show toast and submit without coords
        if (geolocation.error) {
          toast.info('Location unavailable, showing all results');
        }
        handleSubmit(pendingResult);
      }
    };

    // Start checking after a brief delay to allow geolocation to complete
    setTimeout(checkGeo, 100);
  }, [pendingResult, geolocation, handleSubmit]);

  /** Always-enabled emergency line handler. */
  const handleEmergencyLine = useCallback(() => {
    window.location.href = 'tel:119';
  }, []);

  return (
    <AppDrawer
      open={open}
      onClose={handleClose}
      title="What's bringing you in today?"
      description='Select a concern to get matched with the right care.'
      ctaLabel='Get Recommendation'
      ctaDisabled={!pendingResult}
      onCtaClick={handleCtaClick}
      footerContent={
        <button
          type='button'
          onClick={handleEmergencyLine}
          className='mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50'
        >
          <ShieldPlus className='h-4 w-4' />
          Emergency Line
        </button>
      }
    >
      <InterviewAccordion
        options={allComplaints}
        onComplete={handleAccordionComplete}
      />
    </AppDrawer>
  );
}
