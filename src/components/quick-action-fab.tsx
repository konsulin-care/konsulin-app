'use client';
/* eslint-disable unicorn/no-document-cookie */

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { resolveMode, useFab } from '@/context/fabContext';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import AddAssessmentDrawer from './add-assessment-drawer';
import AddLocationDrawer from './add-location-drawer';
import { ActionFab } from './fab/action-button';
import { FabCustomMenu } from './fab/custom-menu';
import { adminPills, patientPills, practitionerPills } from './fab/pills';
import { SelectionFab } from './fab/selection-button';
import { FabSpeedDial } from './fab/speed-dial';
import { FabToggleShell } from './fab/toggle-shell';
import type { MenuAction, Pill } from './fab/types';
import { useScrollHide } from './fab/use-scroll-hide';
import RegisterPractitionerDrawer from './register-practitioner-drawer';

/** Get the appropriate set of pills for the user's role. */
function getRolePills(roleName: string | undefined): Pill[] {
  if (roleName === Roles.ClinicAdmin) return adminPills;
  if (roleName === Roles.Practitioner) return practitionerPills;
  return patientPills;
}

/** Redirect guest users to auth with intent cookie. */
function redirectGuestIfNeeded(pill: Pill, isGuest: boolean): boolean {
  if (!isGuest || !pill.href || pill.href === '/assessments') return false;
  document.cookie = `redirect_intent=${encodeURIComponent(pill.href)}; Path=/; Max-Age=300; SameSite=Lax`;
  return true;
}

/**
 * Global floating action button with four modes:
 * selection (delete), action (save), menu (custom), idle (speed-dial).
 */
export default function QuickActionFab() {
  const router = useRouter();
  const { state: authState } = useAuth();
  const { state, dispatch } = useFab();
  const [showRegisterPrac, setShowRegisterPrac] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddAssessment, setShowAddAssessment] = useState(false);

  const mode = resolveMode(state);
  const roleName = authState?.userInfo?.role_name;
  const isGuest = roleName === Roles.Guest;
  const pills = getRolePills(roleName);
  const isVisible = useScrollHide(mode.type !== 'idle');

  const close = useCallback(
    () => dispatch({ type: 'CLOSE_PANEL' }),
    [dispatch]
  );
  const toggle = useCallback(
    () => dispatch({ type: 'TOGGLE_PANEL' }),
    [dispatch]
  );

  const handlePillClick = useCallback(
    (pill: Pill) => {
      close();
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
      if (redirectGuestIfNeeded(pill, isGuest)) {
        router.push('/auth');
        return;
      }
      if (pill.href) router.push(pill.href);
    },
    [close, isGuest, router]
  );

  const handleCustomAction = useCallback(
    (action: MenuAction) => {
      close();
      // skipcq: JS-0098 - fire-and-forget action with handled rejection
      void Promise.resolve(action.onAction()).catch(() => {
        /* handled */
      });
    },
    [close]
  );

  const fabVisibility = isVisible
    ? 'translate-y-0 opacity-100'
    : 'pointer-events-none translate-y-[100px] opacity-0';

  switch (mode.type) {
    case 'selection': {
      return (
        <div
          className={`fixed right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 transition-all duration-300 ${fabVisibility}`}
        >
          <SelectionFab config={mode.config} />
        </div>
      );
    }

    case 'action': {
      return (
        <div
          className={`fixed right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 transition-all duration-300 ${fabVisibility}`}
        >
          <ActionFab config={mode.config} />
        </div>
      );
    }

    case 'menu': {
      return (
        <>
          <FabToggleShell
            isOpen={state.panelOpen}
            onClose={close}
            onToggle={toggle}
            icon={mode.config.icon}
            visibilityClass={fabVisibility}
          >
            {state.panelOpen && (
              <FabCustomMenu
                actions={mode.config.actions}
                onAction={handleCustomAction}
              />
            )}
          </FabToggleShell>
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
        </>
      );
    }

    case 'idle': {
      return (
        <>
          <FabToggleShell
            isOpen={state.panelOpen}
            onClose={close}
            onToggle={toggle}
            icon={Plus}
            visibilityClass={fabVisibility}
          >
            {state.panelOpen && (
              <FabSpeedDial pills={pills} onPillClick={handlePillClick} />
            )}
          </FabToggleShell>
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
        </>
      );
    }

    default: {
      mode satisfies never;
    }
  }
}
