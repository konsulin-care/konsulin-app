import { i18nMockFactory } from '@/__tests__/mocks/i18n-mock';
import type { ReactNode, SVGProps } from 'react';
import { createElement } from 'react';

/**
 * Shared vi.mock factories for the payment drawer tests (i18n, avatar,
 * icons, button, and drawer mocks). Consumed via dynamic import inside
 * async vi.mock factories (hoisting-safe), e.g.:
 * `vi.mock('@/i18n', async () => (await import('./payment-drawer-mocks')).paymentDrawerI18nMockFactory())`.
 *
 * This module is `.ts`, so mock components use `createElement` instead of
 * JSX. The button and drawer factories are supersets: they expose the full
 * export surface either test file needs.
 */

/**
 * Factory for the `@/i18n` module mock; delegates to the repo-shared i18n
 * mock factory.
 *
 * @returns The mocked `@/i18n` module shape.
 */
export function paymentDrawerI18nMockFactory() {
  return i18nMockFactory();
}

/** Props accepted by the mocked avatar component. */
interface MockAvatarProps {
  initials?: string;
  photoUrl?: string;
}

/**
 * Factory for the `@/components/general/avatar` module mock: renders a
 * testid div carrying the initials and photo attributes.
 *
 * @returns The mocked avatar module shape.
 */
export function paymentDrawerAvatarMockFactory() {
  return {
    default: ({ initials, photoUrl }: MockAvatarProps) =>
      createElement(
        'div',
        {
          'data-testid': 'mock-avatar',
          'data-initials': initials,
          'data-photo': photoUrl
        },
        'Avatar'
      )
  };
}

/**
 * Factory for the `@/components/icons` module mock: renders the
 * LoadingSpinnerIcon as a testid svg.
 *
 * @returns The mocked icons module shape.
 */
export function paymentDrawerIconsMockFactory() {
  return {
    LoadingSpinnerIcon: (props: SVGProps<SVGSVGElement>) =>
      createElement('svg', {
        'data-testid': 'mock-loading-spinner',
        ...props
      })
  };
}

/** Props accepted by the mocked button component. */
interface MockButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Factory for the `@/components/ui/button` module mock: renders a testid
 * button and exposes a stubbed `buttonVariants`.
 *
 * @returns The mocked button module shape.
 */
export function paymentDrawerButtonMockFactory() {
  return {
    Button: Object.assign(
      ({ children, onClick, disabled, className }: MockButtonProps) =>
        createElement(
          'button',
          { 'data-testid': 'mock-button', onClick, disabled, className },
          children
        ),
      { displayName: 'Button' }
    ),
    buttonVariants: () => 'btn-variants-class'
  };
}

/** Props accepted by the mocked drawer shell components. */
interface MockDrawerChildProps {
  children: ReactNode;
}

/**
 * Factory for the `@/components/ui/drawer` module mock: renders testid
 * wrappers for the drawer shell used by AppDrawer.
 *
 * @returns The mocked drawer module shape.
 */
export function paymentDrawerUIMockFactory() {
  return {
    Drawer: ({ children, open }: MockDrawerChildProps & { open: boolean }) =>
      createElement(
        'div',
        { 'data-testid': 'mock-drawer', 'data-open': open },
        children
      ),
    DrawerContent: ({ children }: MockDrawerChildProps) =>
      createElement('div', { 'data-testid': 'mock-drawer-content' }, children),
    DrawerHeader: ({ children }: MockDrawerChildProps) =>
      createElement('div', { 'data-testid': 'mock-drawer-header' }, children),
    DrawerTitle: ({ children }: MockDrawerChildProps) =>
      createElement('div', { 'data-testid': 'mock-drawer-title' }, children),
    DrawerDescription: ({ children }: MockDrawerChildProps) =>
      createElement(
        'div',
        { 'data-testid': 'mock-drawer-description' },
        children
      ),
    DrawerTrigger: ({ children }: MockDrawerChildProps) => children
  };
}
