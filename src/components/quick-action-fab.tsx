'use client';

import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

const pills = [
  { label: 'Self Checkup', href: '/assessments', delay: 0 },
  { label: 'View Schedule', href: '/schedule', delay: 50 },
  { label: 'See Clinics', href: '/clinic', delay: 100 },
  { label: 'Get Recommendation', href: '/recommendation', delay: 150 }
];

const SCROLL_THRESHOLD = 10;
const SCROLL_HIDE_OFFSET = 100;

export default function QuickActionFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

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

  return (
    <>
      {isOpen && (
        <div
          className='animate-overlay-in fixed inset-0 z-40 bg-black/80'
          onClick={close}
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
              <Link
                key={pill.href}
                href={pill.href}
                onClick={close}
                className='animate-pill-in inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-[#2c2f35] shadow-lg transition-colors hover:bg-gray-50'
                style={{ animationDelay: `${pill.delay}ms` }}
              >
                {pill.label}
              </Link>
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
