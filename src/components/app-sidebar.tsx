'use client';

import { useTranslations } from '@/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { usePillActions } from './fab/use-pill-actions';
import { SidebarNavItems } from './sidebar-nav-items';
import SidebarPrimaryAction from './sidebar-primary-action';

interface AppSidebarProps {
  /** Extra classes appended to the navigation element. */
  className?: string;
}

/**
 * Responsive primary navigation: a 96px icon rail on tablets and a 240px
 * labelled sidebar on desktop. Phones keep the floating action button, so the
 * element is hidden below the md breakpoint.
 *
 * @param props.className - Optional classes merged onto the nav element
 * @returns The navigation landmark, the role pills and the pill drawers
 */
export default function AppSidebar({
  className = ''
}: Readonly<AppSidebarProps>) {
  const t = useTranslations('page-header');
  const { pills, onPillClick, drawers } = usePillActions();

  return (
    <>
      <nav
        aria-label={t('main_navigation')}
        data-shell='nav'
        className={`bg-card border-border fixed inset-y-0 left-0 z-30 hidden w-24 flex-col gap-4 border-r px-2 py-4 md:flex lg:w-60 lg:px-4 ${className}`}
      >
        <Link
          href='/'
          className='flex min-h-11 items-center justify-center gap-2 lg:justify-start'
        >
          <Image
            src='/images/site-logo.svg'
            alt=''
            width={36}
            height={36}
            className='h-9 w-9'
          />
          <span className='text-foreground sr-only text-xl font-extrabold tracking-tight lg:not-sr-only'>
            Konsulin
          </span>
        </Link>
        <SidebarNavItems pills={pills} onPillClick={onPillClick} />
        <div data-slot='primary-action' className='md:sticky md:top-4'>
          <SidebarPrimaryAction />
        </div>
        <div data-slot='account' className='mt-auto' />
      </nav>
      {drawers}
    </>
  );
}
