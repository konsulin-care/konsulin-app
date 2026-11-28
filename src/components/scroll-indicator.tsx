'use client';

import { useScrollIndicator } from '@/hooks/useScrollIndicator';

const THUMB_CLASSNAME =
  'fixed right-0.5 z-50 w-[3px] rounded-full bg-charcoal-400/50 pointer-events-none transition-opacity motion-reduce:transition-none';

/**
 * Render a 3px overlay thumb that follows the page scroll position.
 *
 * Renders nothing when the page does not overflow the viewport.
 *
 * @returns The scroll indicator element, or null
 */
export function ScrollIndicator() {
  const { visible, top, height, overflows } = useScrollIndicator();

  if (!overflows) return null;

  return (
    <div
      aria-hidden='true'
      data-testid='scroll-indicator'
      data-visible={visible ? 'true' : 'false'}
      className={`${THUMB_CLASSNAME} ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ top: `${top}px`, height: `${height}px` }}
    />
  );
}
