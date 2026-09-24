'use client';

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useResearchFabAction } from './use-fab-action';

/** No-op participate callback — not used on form pages. */
const noopParticipate = () => {
  /* noop */
};

/**
 * Bridges research form actions to the FAB context.
 * Must be rendered inside ResearchFormActionsProvider.
 */
export function ResearchFormFabBridge() {
  const rawRouter = useRouter();
  // Stabilize router ref to prevent infinite effect loops in useResearchFabAction
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const router = useMemo(() => ({ push: rawRouter.push }), [rawRouter.push]);
  const { state: authState } = useAuth();
  const role = authState?.userInfo?.role_name;
  const isResearcher = role === Roles.Researcher;

  useResearchFabAction({
    isResearcher,
    activeStudy: null,
    participate: noopParticipate,
    router
  });

  return null;
}
