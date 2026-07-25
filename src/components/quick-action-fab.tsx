'use client';
/* eslint-disable unicorn/no-document-cookie */

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useFabDirty, type FabDirtyState } from '@/context/fabDirtyContext';
import { useFabMenu, type FabMenuState } from '@/context/fabMenuContext';
import { useFabSelection } from '@/context/fabSelectionContext';
import { cn } from '@/lib/utils';
import {
  BookText,
  Calendar,
  ClipboardClock,
  HeartPulse,
  MapPin,
  Sparkles,
  UserPlus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import AddLocationDrawer from './add-location-drawer';
import {
  CustomMenuPills,
  DeleteFabButton,
  FabToggleButton,
  type CustomAction,
  type Pill
} from './fab-shared';
import RegisterPractitionerDrawer from './register-practitioner-drawer';

const patientPills: Pill[] = [
  {
    label: 'Self Checkup',
    href: '/assessments',
    icon: HeartPulse,
    delay: 0,
    action: 'navigate'
  },
  {
    label: 'Write Journal',
    href: '/journal',
    icon: BookText,
    delay: 50,
    action: 'navigate'
  },
  {
    label: 'View Schedule',
    href: '/schedule',
    icon: Calendar,
    delay: 100,
    action: 'navigate'
  },
  {
    label: 'Get Recommendation',
    href: '/recommendation',
    icon: Sparkles,
    delay: 150,
    action: 'navigate'
  }
];

const practitionerPills: Pill[] = [
  {
    label: 'Set Availability',
    href: '/practitioner',
    icon: ClipboardClock,
    delay: 0,
    action: 'navigate'
  },
  {
    label: 'View Schedule',
    href: '/schedule',
    icon: Calendar,
    delay: 50,
    action: 'navigate'
  },
  {
    label: 'Health Screening',
    href: '/assessments',
    icon: HeartPulse,
    delay: 100,
    action: 'navigate'
  },
  {
    label: 'S.O.A.P.',
    href: '/assessments/soap',
    icon: BookText,
    delay: 150,
    action: 'navigate'
  }
];

const adminPills: Pill[] = [
  {
    label: 'Register Practitioner',
    icon: UserPlus,
    delay: 0,
    action: 'register-practitioner'
  },
  { label: 'Add Location', icon: MapPin, delay: 50, action: 'add-location' }
];

const SCROLL_THRESHOLD = 10;
const SCROLL_HIDE_OFFSET = 100;

function useScrollVisibility(isOpen: boolean, isDirty: boolean) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen || isDirty) return;
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (Math.abs(delta) < SCROLL_THRESHOLD) return;
      if (delta > 0 && currentY > SCROLL_HIDE_OFFSET) setIsVisible(false);
      else if (delta < 0) setIsVisible(true);
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen, isDirty]);
  return isVisible;
}

/** Render a list of speed-dial pill buttons. */
function PillButtons({
  pills,
  onPillClick
}: {
  readonly pills: readonly Pill[];
  readonly onPillClick: (pill: Pill) => void;
}) {
  return (
    <div className='flex flex-col-reverse items-end gap-3'>
      {pills.map(pill => (
        <button
          key={pill.label}
          type='button'
          onClick={() => onPillClick(pill)}
          className='animate-pill-in inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium text-[#2c2f35] shadow-lg transition-colors hover:bg-gray-50'
          style={{ animationDelay: `${pill.delay}ms` }}
        >
          <pill.icon className='h-4 w-4' />
          {pill.label}
        </button>
      ))}
    </div>
  );
}

function redirectGuestIfNeeded(pill: Pill, isGuest: boolean): boolean {
  if (!isGuest || !pill.href || pill.href === '/assessments') return false;
  document.cookie = `redirect_intent=${encodeURIComponent(pill.href)}; Path=/; Max-Age=300; SameSite=Lax`;
  return true;
}

function getRolePills(roleName: string | undefined): Pill[] {
  if (roleName === Roles.ClinicAdmin) return adminPills;
  if (roleName === Roles.Practitioner) return practitionerPills;
  return patientPills;
}

interface FabContentProps {
  readonly isOpen: boolean;
  readonly isDirty: boolean;
  readonly isMenuMode: boolean;
  readonly isVisible: boolean;
  readonly menuState: FabMenuState;
  readonly pills: Pill[];
  readonly dirtyState: FabDirtyState | null;
  readonly close: () => void;
  readonly toggle: () => void;
  readonly handlePillClick: (pill: Pill) => void;
  readonly handleCustomAction: (action: CustomAction) => void;
  readonly showRegisterPrac: boolean;
  readonly showAddLocation: boolean;
  readonly setShowRegisterPrac: (v: boolean) => void;
  readonly setShowAddLocation: (v: boolean) => void;
}

function FabContent({
  isOpen,
  isDirty,
  isMenuMode,
  isVisible,
  menuState,
  pills,
  dirtyState,
  close,
  toggle,
  handlePillClick,
  handleCustomAction,
  showRegisterPrac,
  showAddLocation,
  setShowRegisterPrac,
  setShowAddLocation
}: FabContentProps) {
  return (
    <>
      {isOpen && !isDirty && (
        <button
          type='button'
          className='animate-overlay-in fixed inset-0 z-40 bg-black/40'
          onClick={close}
          aria-label='Close menu'
        />
      )}
      <div
        className={cn(
          'fixed z-50 flex flex-col items-end gap-3 transition-all duration-300',
          'right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]',
          isVisible || isDirty || isMenuMode
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-[100px] opacity-0'
        )}
      >
        {isMenuMode && isOpen && (
          <CustomMenuPills
            actions={menuState.actions}
            onAction={handleCustomAction}
          />
        )}
        {!isMenuMode && isOpen && !isDirty && (
          <PillButtons pills={pills} onPillClick={handlePillClick} />
        )}
        <FabToggleButton
          isOpen={isOpen}
          isDirty={isDirty}
          dirtyLabel={dirtyState?.label}
          icon={isMenuMode ? menuState?.icon : dirtyState?.icon}
          onToggle={toggle}
        />
      </div>
      <RegisterPractitionerDrawer
        open={showRegisterPrac}
        onClose={() => setShowRegisterPrac(false)}
      />
      <AddLocationDrawer
        open={showAddLocation}
        onClose={() => setShowAddLocation(false)}
      />
    </>
  );
}

/**
 * Global floating action button with three modes:
 * selection (delete), dirty (save), speed-dial (navigation).
 */
export default function QuickActionFab() {
  const router = useRouter();
  const { state: authState } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showRegisterPrac, setShowRegisterPrac] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);

  const { dirtyState } = useFabDirty();
  const { menuState } = useFabMenu();
  const { selectionState } = useFabSelection();
  const isDirty = dirtyState?.isDirty ?? false;
  const isMenuMode = menuState !== null;
  const isVisible = useScrollVisibility(isOpen, isDirty);

  const roleName = authState?.userInfo?.role_name;
  const isGuest = roleName === Roles.Guest;

  const pills = getRolePills(roleName);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => {
    if (isMenuMode || !dirtyState?.isDirty) {
      setIsOpen(v => !v);
      return;
    }
    if (!dirtyState.isSaving)
      Promise.resolve(dirtyState.onSave()).catch(() => {
        /* handled */
      });
  }, [dirtyState, isMenuMode]);

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
      if (redirectGuestIfNeeded(pill, isGuest)) {
        router.push('/auth');
        return;
      }
      if (pill.href) router.push(pill.href);
    },
    [close, isGuest, router]
  );

  const handleCustomAction = useCallback(
    (action: CustomAction) => {
      close();
      action.onAction();
    },
    [close]
  );

  if (selectionState) {
    return (
      <div
        className={cn(
          'fixed z-50 flex flex-col items-end gap-3 transition-all duration-300',
          'right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'
        )}
      >
        <DeleteFabButton
          count={selectionState.count}
          onDelete={selectionState.onDelete}
        />
      </div>
    );
  }

  return (
    <FabContent
      isOpen={isOpen}
      isDirty={isDirty}
      isMenuMode={isMenuMode}
      isVisible={isVisible}
      menuState={menuState}
      pills={pills}
      dirtyState={dirtyState}
      close={close}
      toggle={toggle}
      handlePillClick={handlePillClick}
      handleCustomAction={handleCustomAction}
      showRegisterPrac={showRegisterPrac}
      showAddLocation={showAddLocation}
      setShowRegisterPrac={setShowRegisterPrac}
      setShowAddLocation={setShowAddLocation}
    />
  );
}
