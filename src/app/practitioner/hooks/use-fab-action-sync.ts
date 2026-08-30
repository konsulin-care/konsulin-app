import type { FabAction } from '@/context/fabContext';
import { useEffect, type RefObject } from 'react';

/**
 * Sync FAB action state to show "Book Now" when the booking form is ready
 * in page mode; clears the action otherwise.
 */
export function useFabActionSync({
  isPageMode,
  isFormValid,
  fabDispatch,
  handleSubmitFormRef
}: {
  isPageMode: boolean;
  isFormValid: boolean;
  fabDispatch: React.Dispatch<FabAction>;
  handleSubmitFormRef: RefObject<() => void>;
}) {
  useEffect(() => {
    if (isPageMode && isFormValid) {
      fabDispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Book Now',
          onAction: () => handleSubmitFormRef.current(),
          isSaving: false,
          variant: 'primary'
        }
      });
    } else {
      fabDispatch({ type: 'SET_ACTION', config: null });
    }

    return () => {
      fabDispatch({ type: 'SET_ACTION', config: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormValid, isPageMode, fabDispatch]);
}
