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
  Plus,
  Sparkles,
  Trash2,
  UserPlus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import AddLocationDrawer from './add-location-drawer';
import RegisterPractitionerDrawer from './register-practitioner-drawer';

type Pill = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
  action: 'navigate' | 'register-practitioner' | 'add-location';
  href?: string;
};

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

function FabToggleButton({
  isOpen,
  isDirty,
  dirtyLabel,
  icon: Icon,
  onToggle
}: {
  readonly isOpen: boolean;
  readonly isDirty: boolean;
  readonly dirtyLabel: string | undefined;
  readonly icon?: React.ComponentType<{ className?: string }>;
  readonly onToggle: () => void;
}) {
  const ToggleIcon = Icon ?? Plus;
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center justify-center rounded-full bg-[#13C2C2] text-white shadow-lg transition-all duration-300 hover:bg-[#0ea5a5]',
        isDirty ? 'h-14 px-6' : 'h-14 w-14',
        isOpen && !isDirty ? 'rotate-45' : ''
      )}
    >
      {isDirty && !Icon ? (
        <span className='text-sm font-semibold whitespace-nowrap'>
          {dirtyLabel ?? 'Save Changes'}
        </span>
      ) : (
        <ToggleIcon className='h-6 w-6 transition-transform duration-300' />
      )}
    </button>
  );
}

function CustomMenuPills({
  actions,
  onAction
}: {
  readonly actions: readonly {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onAction: () => void;
  }[];
  readonly onAction: (action: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onAction: () => void;
  }) => void;
}) {
  return (
    <div className='flex flex-col-reverse items-end gap-3'>
      {actions.map(action => (
        <button
          key={action.label}
          type='button'
          onClick={() => onAction(action)}
          className='animate-pill-in inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium text-[#2c2f35] shadow-lg transition-colors hover:bg-gray-50'
        >
          <action.icon className='h-4 w-4' />
          {action.label}
        </button>
      ))}
    </div>
  );
}

function DeleteFabButton({
  count,
  onDelete
}: {
  readonly count: number;
  readonly onDelete: () => void;
}) {
  return (
    <button
      onClick={onDelete}
      className='flex h-14 items-center gap-2 rounded-full bg-red-500 px-6 text-white shadow-lg transition-all duration-300 hover:bg-red-600'
    >
      <Trash2 className='h-5 w-5' />
      <span className='text-sm font-semibold whitespace-nowrap'>
        Delete ({count})
      </span>
    </button>
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
}: {
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
  readonly handleCustomAction: (action: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onAction: () => void;
  }) => void;
  readonly showRegisterPrac: boolean;
  readonly showAddLocation: boolean;
  readonly setShowRegisterPrac: (v: boolean) => void;
  readonly setShowAddLocation: (v: boolean) => void;
}) {
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
 *
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
    if (isMenuMode || !dirtyState) {
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
    (action: {
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      onAction: () => void;
    }) => {
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
