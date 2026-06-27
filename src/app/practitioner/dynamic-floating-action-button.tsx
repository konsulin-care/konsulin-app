'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';

type Props = {
  /** Label when dirty (e.g., "Save Changes"). When undefined, uses defaultLabel. */
  label?: string;
  /** Default label when not dirty (e.g., "Add Service"). */
  defaultLabel?: string;
  /** Save handler, called when user clicks while dirty. */
  onSave?: () => void | Promise<void>;
  /** Default action handler, called when user clicks in default state. */
  onDefaultAction?: () => void;
  /** True while saving. */
  isSaving?: boolean;
  /** True when there are unsaved changes. */
  isDirty?: boolean;
};

/**
 * Single floating action button that transforms between default and save states.
 *
 * - Dirty state: shows "Save Changes" (or custom `label`), calls `onSave`
 * - Default state: shows `defaultLabel` (or nothing if undefined), calls `onDefaultAction`
 */
export default function DynamicFloatingActionButton({
  label,
  defaultLabel,
  onSave,
  onDefaultAction,
  isSaving = false,
  isDirty = false
}: Props) {
  const [visible, setVisible] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string | undefined>(
    defaultLabel
  );
  const prevDirty = useRef(isDirty);

  useEffect(() => {
    if (isDirty) {
      setCurrentLabel(label ?? 'Save Changes');
      setVisible(true);
    } else {
      setCurrentLabel(defaultLabel);
      setVisible(Boolean(defaultLabel));
    }
    prevDirty.current = isDirty;
  }, [isDirty, label, defaultLabel]);

  if (!visible || !currentLabel) return null;

  return (
    <div className='fixed right-6 bottom-6 z-50 flex gap-2'>
      <Button
        onClick={() => {
          if (isDirty && onSave) {
            void onSave();
          } else if (onDefaultAction) {
            onDefaultAction();
          }
        }}
        disabled={isSaving}
        className='bg-secondary hover:bg-secondary/90 h-12 rounded-full px-6 text-white shadow-lg'
        size='lg'
      >
        {isSaving ? (
          <>
            <LoadingSpinnerIcon
              stroke='white'
              width={20}
              height={20}
              className='mr-2 animate-spin'
            />
            Saving...
          </>
        ) : (
          currentLabel
        )}
      </Button>
    </div>
  );
}
