'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useTranslations } from '@/i18n';
import { Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Pill } from './fab/types';

/**
 * Shared layout classes for every navigation item (rail and sidebar).
 *
 * Items stay flexbox at every breakpoint: `line-clamp` would switch the anchor
 * to a -webkit-box display and break the icon/label alignment.
 */
const NAV_ITEM_CLASS =
  'flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted md:justify-center md:px-0 lg:justify-start lg:px-3';

/** Visually hides the label below lg while keeping it as the accessible name. */
const NAV_LABEL_CLASS = 'md:sr-only lg:not-sr-only';

/** Extra classes applied to the item matching the current pathname. */
const ACTIVE_ITEM_CLASS =
  'bg-accent font-bold shadow-[inset_3px_0_0_var(--color-turquoise-deep)]';

/** Removes query string and hash so only the pathname decides activity. */
function normalizePath(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  const [path] = pathname.split(/[?#]/);
  return path || '/';
}

/**
 * True when `href` is the active destination for the current pathname.
 *
 * The research page is the home destination, so Home stays current on
 * `/research` and its nested paths as well as on `/`. The studies catalogue
 * and the single study page share the Browse studies pill, so `/study` and its
 * nested paths keep that item current too.
 */
function isActivePath(href: string, pathname: string): boolean {
  if (href === '/') {
    return (
      pathname === '/' ||
      pathname === '/research' ||
      pathname.startsWith('/research/')
    );
  }
  if (href === '/studies') {
    return (
      pathname === '/studies' ||
      pathname.startsWith('/studies/') ||
      pathname === '/study' ||
      pathname.startsWith('/study/')
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Guest pills that stay plain links instead of routing through auth. */
const GUEST_LINK_HREFS: ReadonlySet<string> = new Set([
  '/assessments',
  '/studies'
]);

/** Builds the class list for a nav item, including its active styling. */
function navItemClass(active: boolean): string {
  return active ? `${NAV_ITEM_CLASS} ${ACTIVE_ITEM_CLASS}` : NAV_ITEM_CLASS;
}

interface NavTooltipItemProps {
  /** Translated label shown in the tooltip. */
  label: string;
  /** Single trigger element (link or button) the tooltip is attached to. */
  children: ReactNode;
}

/**
 * Wraps one nav trigger in a right-side tooltip for the icon-only rail.
 *
 * The content is hidden from lg up, where the label is visible again.
 */
function NavTooltipItem({ label, children }: Readonly<NavTooltipItemProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side='right' className='lg:hidden'>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface NavHomeItemProps {
  /** Whether the Home link is the active destination. */
  active: boolean;
  /** Translated Home label used for the text and the tooltip. */
  label: string;
}

/** Renders the Home link wrapped in the rail tooltip. */
function NavHomeItem({ active, label }: Readonly<NavHomeItemProps>) {
  return (
    <li>
      <NavTooltipItem label={label}>
        <Link
          href='/'
          aria-current={active ? 'page' : undefined}
          className={navItemClass(active)}
        >
          <Home className='h-5 w-5 shrink-0' aria-hidden='true' />
          <span className={NAV_LABEL_CLASS}>{label}</span>
        </Link>
      </NavTooltipItem>
    </li>
  );
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
 *
 * Pills with `sidebar: false` are skipped entirely; they remain available in
 * the mobile FAB speed dial.
 *
 * Below lg the items form an icon-only rail, so each trigger carries a
 * tooltip with the same translated label.
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
  const homeLabel = t('nav_home');

  return (
    <TooltipProvider delayDuration={300}>
      <ul className='flex flex-col gap-1 md:w-full'>
        <NavHomeItem active={homeActive} label={homeLabel} />
        {pills
          .filter(pill => pill.sidebar !== false)
          .map(pill => {
            const href = pill.href;
            const active = href ? isActivePath(href, pathname) : false;
            const label = t(pill.label);
            const content = (
              <>
                <pill.icon className='h-5 w-5 shrink-0' aria-hidden='true' />
                <span className={NAV_LABEL_CLASS}>{label}</span>
              </>
            );
            const useButton =
              href === undefined || (isGuest && !GUEST_LINK_HREFS.has(href));
            const trigger = useButton ? (
              <button
                type='button'
                onClick={() => onPillClick(pill)}
                className={navItemClass(active)}
              >
                {content}
              </button>
            ) : (
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={navItemClass(active)}
              >
                {content}
              </Link>
            );

            return (
              <li key={pill.label}>
                <NavTooltipItem label={label}>{trigger}</NavTooltipItem>
              </li>
            );
          })}
      </ul>
    </TooltipProvider>
  );
}
