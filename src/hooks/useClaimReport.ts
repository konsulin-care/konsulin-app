import { saveIntent } from '@/utils/redirect-intent';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface UseClaimReportParams {
  /** Post-claim navigation target. */
  path: string;
  /** Optional response id for local draft cleanup. */
  qrId?: string;
}

/**
 * Builds the claim-report handler: saves an assessmentResult intent and
 * sends the user to /auth.
 *
 * @param params - Destination path and optional qr id.
 * @returns Stable callback that starts the claim flow.
 */
export function useClaimReport({ path, qrId }: UseClaimReportParams) {
  const router = useRouter();
  return useCallback(() => {
    saveIntent('assessmentResult', qrId ? { path, qrId } : { path });
    router.push(`/auth?redirectToPath=${path}`);
  }, [path, qrId, router]);
}
