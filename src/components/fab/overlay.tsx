'use client';

/** Semi-transparent backdrop overlay for the FAB panel. */
export function FabOverlay({ onClose }: { readonly onClose: () => void }) {
  return (
    <button
      type='button'
      className='animate-overlay-in fixed inset-0 z-40 bg-black/40'
      onClick={onClose}
      aria-label='Close menu'
    />
  );
}
