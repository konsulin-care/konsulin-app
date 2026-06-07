'use client';

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { cn } from '@/lib/utils';
import { BookText, Calendar, HeartPulse, Plus, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const pills = [
  { label: 'Self Checkup', href: '/assessments', icon: HeartPulse, delay: 0 },
  { label: 'Write Journal', href: '/journal', icon: BookText, delay: 50 },
  { label: 'View Schedule', href: '/schedule', icon: Calendar, delay: 100 },
  {
    label: 'Get Recommendation',
    href: '/recommendation',
    icon: Sparkles,
    delay: 150
  }
];

const SCROLL_THRESHOLD = 10;
const SCROLL_HIDE_OFFSET = 100;

export default function QuickActionFab() {
  const router = useRouter();
  const { state: authState } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const isGuest = authState?.userInfo?.role_name === Roles.Guest;

  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) return;

      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (Math.abs(delta) < SCROLL_THRESHOLD) {
        return;
      }

      if (delta > 0 && currentY > SCROLL_HIDE_OFFSET) {
        setIsVisible(false);
      } else if (delta < 0) {
        setIsVisible(true);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(v => !v), []);

  const handlePillClick = useCallback(
    (href: string) => {
      close();
      if (isGuest && href !== '/assessments') {
        document.cookie = `redirect_intent=${encodeURIComponent(href)}; Path=/; Max-Age=300; SameSite=Lax`;
        router.push('/auth');
        return;
      }
      router.push(href);
    },
    [close, isGuest, router]
  );

  return (
    <>
      {isOpen && (
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
          isVisible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-[100px] opacity-0'
        )}
      >
        {isOpen && (
          <div className='flex flex-col-reverse items-end gap-3'>
            {pills.map(pill => (
              <button
                key={pill.href}
                type='button'
                onClick={() => handlePillClick(pill.href)}
                className='animate-pill-in inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium text-[#2c2f35] shadow-lg transition-colors hover:bg-gray-50'
                style={{ animationDelay: `${pill.delay}ms` }}
              >
                <pill.icon className='h-4 w-4' />
                {pill.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={toggle}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full bg-[#13C2C2] text-white shadow-lg transition-transform duration-300 hover:bg-[#0ea5a5]',
            isOpen ? 'rotate-45' : ''
          )}
        >
          <Plus className='h-6 w-6 transition-transform duration-300' />
        </button>
      </div>
    </>
  );
}
