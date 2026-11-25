'use client';

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useTranslations } from '@/i18n';
import { Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Pill } from './fab/types';

/** Shared layout classes for every navigation item (rail and sidebar). */
const NAV_ITEM_CLASS =
  'flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted md:flex-col md:justify-center md:gap-1 md:px-1 md:text-center md:text-xs md:line-clamp-2 lg:flex-row lg:justify-start lg:gap-2 lg:px-3 lg:text-sm';

/** Extra classes applied to the item matching the current pathname. */
const ACTIVE_ITEM_CLASS =
  'bg-accent font-bold shadow-[inset_3px_0_0_var(--color-turquoise-deep)]';

/** Removes query string and hash so only the pathname decides activity. */
function normalizePath(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  const [path] = pathname.split(/[?#]/);
  return path || '/';
}

/** True when `href` is the active destination for the current pathname. */
function isActivePath(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Builds the class list for a nav item, including its active styling. */
function navItemClass(active: boolean): string {
  return active ? `${NAV_ITEM_CLASS} ${ACTIVE_ITEM_CLASS}` : NAV_ITEM_CLASS;
}

interface SidebarNavItemsProps {
  /** Role pills rendered after the Home link. */
  pills: readonly Pill[];
  /** Routes button-style pills through the FAB pill actions. */
  onPillClick: (pill: Pill) => void;
}

/**
 * Home link plus the current role's destination pills.
 *
 * Pills with an href render as links. Pills without an href and guest pills
 * pointing outside /assessments render as buttons so the pill action can open
 * a drawer or redirect the guest to authentication.
 */
export function SidebarNavItems({
  pills,
  onPillClick
}: Readonly<SidebarNavItemsProps>) {
  const t = useTranslations('page-header');
  const pathname = normalizePath(usePathname());
  const { state: authState } = useAuth();
  const isGuest = authState?.userInfo?.role_name === Roles.Guest;
  const homeActive = isActivePath('/', pathname);

  return (
    <ul className='flex flex-col gap-1 md:w-full'>
      <li>
        <Link
          href='/'
          aria-current={homeActive ? 'page' : undefined}
          className={navItemClass(homeActive)}
        >
          <Home className='h-5 w-5 shrink-0' aria-hidden='true' />
          <span className='md:line-clamp-2'>{t('nav_home')}</span>
        </Link>
      </li>
      {pills.map(pill => {
        const href = pill.href;
        const active = href ? isActivePath(href, pathname) : false;
        const label = (
          <>
            <pill.icon className='h-5 w-5 shrink-0' aria-hidden='true' />
            <span className='md:line-clamp-2'>{t(pill.label)}</span>
          </>
        );
        const useButton =
          href === undefined || (isGuest && href !== '/assessments');

        return (
          <li key={pill.label}>
            {useButton ? (
              <button
                type='button'
                onClick={() => onPillClick(pill)}
                className={navItemClass(active)}
              >
                {label}
              </button>
            ) : (
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={navItemClass(active)}
              >
                {label}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
