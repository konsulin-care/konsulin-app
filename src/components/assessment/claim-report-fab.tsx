'use client';

import { useFab } from '@/context/fabContext';
import { useClaimReport } from '@/hooks/useClaimReport';
import { useTranslations } from '@/i18n';
import { BookCheck } from 'lucide-react';
import { useEffect } from 'react';

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
  const t = useTranslations('common');

  const handleClaim = useClaimReport({ path, qrId });

  useEffect(() => {
    if (visible) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: t('report.fab_claim'),
          icon: BookCheck,
          variant: 'primary',
          onAction: handleClaim
        }
      });
    } else {
      dispatch({ type: 'SET_ACTION', config: null });
    }
    return () => dispatch({ type: 'SET_ACTION', config: null });
  }, [visible, dispatch, handleClaim, t]);

  return null;
}
