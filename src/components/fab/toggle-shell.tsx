'use client';

import type { ComponentType, ReactNode } from 'react';
import { FabOverlay } from './overlay';
import { FabToggleButton } from './toggle-button';

interface FabToggleShellProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onToggle: () => void;
  readonly icon?: ComponentType<{ className?: string }>;
  readonly children?: ReactNode;
  readonly visibilityClass?: string;
}

const POSITION_CLASSES =
  'fixed z-50 flex flex-col items-end gap-3 transition-all duration-300 right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]';

/**
 * Shared shell for toggle-based modes (idle → speed-dial, menu → custom menu).
 * Renders overlay when open, pills container, and the toggle button.
 */
export function FabToggleShell({
  isOpen,
  onClose,
  onToggle,
  icon,
  children,
  visibilityClass = ''
}: FabToggleShellProps) {
  return (
    <>
      {isOpen && <FabOverlay onClose={onClose} />}
      <div className={`${POSITION_CLASSES} ${visibilityClass}`.trim()}>
        {isOpen && children}
        <FabToggleButton isOpen={isOpen} icon={icon} onToggle={onToggle} />
      </div>
    </>
  );
}
