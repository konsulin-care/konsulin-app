'use client';
/* eslint-disable unicorn/no-document-cookie */

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useFabDirty } from '@/context/fabDirtyContext';
import { cn } from '@/lib/utils';
import {
  BookText,
  Calendar,
  HeartPulse,
  MapPin,
  Plus,
  Sparkles,
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

/** Tracks scroll direction to hide or show the FAB. */
function useScrollVisibility(isOpen: boolean, isDirty: boolean) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (isOpen || isDirty) return;
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (Math.abs(delta) < SCROLL_THRESHOLD) return;
      if (delta > 0 && currentY > SCROLL_HIDE_OFFSET) {
        setIsVisible(false);
      } else if (delta < 0) {
        setIsVisible(true);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen, isDirty]);

  return isVisible;
}

/** Render the pill buttons when the speed dial is open. */
function PillButtons({
  pills,
  onPillClick
}: {
  pills: Pill[];
  onPillClick: (pill: Pill) => void;
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

/** The round toggle button that opens/closes the FAB speed dial. */
function FabToggleButton({
  isOpen,
  isDirty,
  dirtyLabel,
  onToggle
}: {
  isOpen: boolean;
  isDirty: boolean;
  dirtyLabel: string | undefined;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center justify-center rounded-full bg-[#13C2C2] text-white shadow-lg transition-all duration-300 hover:bg-[#0ea5a5]',
        isDirty ? 'h-14 px-6' : 'h-14 w-14',
        isOpen && !isDirty ? 'rotate-45' : ''
      )}
    >
      {isDirty ? (
        <span className='text-sm font-semibold whitespace-nowrap'>
          {dirtyLabel ?? 'Save Changes'}
        </span>
      ) : (
        <Plus className='h-6 w-6 transition-transform duration-300' />
      )}
    </button>
  );
}

/**
 * Floating action button that shows context-dependent pills.
 * ClinicAdmin sees Register Practitioner and Add Location pills that open drawers.
 * Other roles see navigation pills (Self Checkup, Write Journal, etc.).
 */
export default function QuickActionFab() {
  const router = useRouter();
  const { state: authState } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showRegisterPrac, setShowRegisterPrac] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);

  const { dirtyState } = useFabDirty();
  const isDirty = dirtyState !== null;

  const isVisible = useScrollVisibility(isOpen, isDirty);

  const isGuest = authState?.userInfo?.role_name === Roles.Guest;
  const isAdmin = authState?.userInfo?.role_name === Roles.ClinicAdmin;
  const pills = isAdmin ? adminPills : patientPills;

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => {
    if (dirtyState) {
      void dirtyState.onSave();
    } else {
      setIsOpen(v => !v);
    }
  }, [dirtyState]);

  const handlePillClick = useCallback(
    (pill: Pill) => {
      close();
      if (pill.action === 'register-practitioner') {
        setShowRegisterPrac(true);
      } else if (pill.action === 'add-location') {
        setShowAddLocation(true);
      } else if (isGuest && pill.href && pill.href !== '/assessments') {
        document.cookie = `redirect_intent=${encodeURIComponent(pill.href)}; Path=/; Max-Age=300; SameSite=Lax`;
        router.push('/auth');
      } else if (pill.href) {
        router.push(pill.href);
      }
    },
    [close, isGuest, router]
  );

  return (
    <>
      {isOpen && !isDirty && (
        <button
          type='button'
          className='animate-overlay-in fixed inset-0 z-40 bg-black/80'
          onClick={close}
          aria-label='Close menu'
        />
      )}

      <div
        className={cn(
          'fixed z-50 flex flex-col items-end gap-3 transition-all duration-300',
          'right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]',
          isVisible || isDirty
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-[100px] opacity-0'
        )}
      >
        {isOpen && !isDirty && (
          <PillButtons pills={pills} onPillClick={handlePillClick} />
        )}

        <FabToggleButton
          isOpen={isOpen}
          isDirty={isDirty}
          dirtyLabel={dirtyState?.label}
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
