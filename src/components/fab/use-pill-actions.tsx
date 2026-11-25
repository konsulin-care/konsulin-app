'use client';
/* eslint-disable unicorn/no-document-cookie */

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useRecommendationResult } from '@/context/recommendationContext';
import type { InterviewResult } from '@/types/recommendation-interview';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import AddAssessmentDrawer from '../add-assessment-drawer';
import AddLocationDrawer from '../add-location-drawer';
import RegisterPractitionerDrawer from '../register-practitioner-drawer';
import ScreeningDrawer from '../screening-drawer';
import {
  adminPills,
  patientPills,
  practitionerPills,
  researcherPills
} from './pills';
import type { Pill } from './types';

/** Get the appropriate set of pills for the user's role. */
function getRolePills(roleName: string | undefined): Pill[] {
  if (roleName === Roles.ClinicAdmin) return adminPills;
  if (roleName === Roles.Practitioner) return practitionerPills;
  if (roleName === Roles.Researcher) return researcherPills;
  return patientPills;
}

/** Redirect guest users to auth with intent cookie. */
function redirectGuestIfNeeded(pill: Pill, isGuest: boolean): boolean {
  if (!isGuest || !pill.href || pill.href === '/assessments') return false;
  document.cookie = `redirect_intent=${encodeURIComponent(pill.href)}; Path=/; Max-Age=300; SameSite=Lax`;
  return true;
}

/** Value returned by {@link usePillActions}. */
export interface UsePillActionsResult {
  /** Speed-dial pills for the current role. */
  pills: Pill[];
  /** Handles a pill click: drawers, research registration, guest redirect, navigation. */
  onPillClick: (pill: Pill) => void;
  /** Drawer elements owned by the pill actions; render them alongside the FAB. */
  drawers: ReactNode;
}

/**
 * Owns the FAB pill state: role pills, drawer visibility and click routing.
 *
 * The hook never closes the FAB panel; callers decide when to close it.
 *
 * @returns Role pills, the click handler and the drawer nodes to render
 */
export function usePillActions(): UsePillActionsResult {
  const router = useRouter();
  const { state: authState } = useAuth();
  const queryClient = useQueryClient();
  const { setResult } = useRecommendationResult();
  const [showRegisterPrac, setShowRegisterPrac] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [showScreening, setShowScreening] = useState(false);

  const handleScreeningComplete = useCallback(
    (result: InterviewResult) => {
      setResult(result);
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] }); // skipcq: JS-0098 — fire-and-forget cache invalidation
    },
    [queryClient, setResult]
  );

  const roleName = authState?.userInfo?.role_name;
  const isGuest = roleName === Roles.Guest;
  const pills = getRolePills(roleName);

  const onPillClick = useCallback(
    (pill: Pill) => {
      if (pill.action === 'register-practitioner') {
        setShowRegisterPrac(true);
        return;
      }
      if (pill.action === 'add-location') {
        setShowAddLocation(true);
        return;
      }
      if (pill.action === 'add-assessment') {
        setShowAddAssessment(true);
        return;
      }
      if (pill.action === 'get-recommendation') {
        setShowScreening(true);
        return;
      }
      if (pill.action === 'register-research') {
        if (!authState?.userInfo?.profile_complete) {
          toast.warn(
            'Please complete your profile before registering research.'
          );
          return;
        }
        router.push('/research/register?page=title');
        return;
      }
      if (redirectGuestIfNeeded(pill, isGuest)) {
        router.push('/auth');
        return;
      }
      if (pill.href) router.push(pill.href);
    },
    [authState, isGuest, router]
  );

  const drawers = (
    <>
      <RegisterPractitionerDrawer
        open={showRegisterPrac}
        onClose={() => setShowRegisterPrac(false)}
      />
      <AddLocationDrawer
        open={showAddLocation}
        onClose={() => setShowAddLocation(false)}
      />
      <AddAssessmentDrawer
        open={showAddAssessment}
        onClose={() => setShowAddAssessment(false)}
      />
      <ScreeningDrawer
        open={showScreening}
        onClose={() => setShowScreening(false)}
        onComplete={handleScreeningComplete}
      />
    </>
  );

  return { pills, onPillClick, drawers };
}
