'use client';

import { useFab } from '@/context/fabContext';
import { saveIntent } from '@/utils/redirect-intent';
import { BookCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

interface ClaimReportFabProps {
  /** Post-claim navigation target, e.g. "/report?id=research". */
  path: string;
  /** Optional response id for local draft cleanup after the claim. */
  qrId?: string;
  /** Whether the claim CTA should be offered (guests with loaded data). */
  visible: boolean;
}

/**
 * Transformed action FAB offering guests the "Claim Report" flow.
 *
 * Saves an `assessmentResult` redirect intent targeting `path` and sends the
 * user to /auth. After registration the pending intent claims all anonymous
 * responses and returns to `path`, where server-side data is available.
 * Dispatches no action while `visible` is false and clears on unmount.
 *
 * @param props - Destination path, optional qr id, and visibility.
 */
export default function ClaimReportFab({
  path,
  qrId,
  visible
}: Readonly<ClaimReportFabProps>) {
  const { dispatch } = useFab();
  const router = useRouter();

  const handleClaim = useCallback(() => {
    saveIntent('assessmentResult', qrId ? { path, qrId } : { path });
    router.push(`/auth?redirectToPath=${path}`);
  }, [path, qrId, router]);

  useEffect(() => {
    if (visible) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Claim Report',
          icon: BookCheck,
          variant: 'primary',
          onAction: handleClaim
        }
      });
    } else {
      dispatch({ type: 'SET_ACTION', config: null });
    }
    return () => dispatch({ type: 'SET_ACTION', config: null });
  }, [visible, dispatch, handleClaim]);

  return null;
}
