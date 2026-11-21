import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/** Find the open Radix overlay node in the document. */
function findOpenOverlay(): Element | null {
  return document.querySelector('.fixed.inset-0[data-state="open"]');
}

describe('DialogOverlay', () => {
  it('uses the charcoal overlay token instead of bg-black/80', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    const overlay = findOpenOverlay();
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass('bg-charcoal-900/80');
    expect(overlay).not.toHaveClass('bg-black/80');
  });
});

describe('AlertDialogOverlay', () => {
  it('uses the charcoal overlay token instead of bg-black/80', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Alert Title</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    );

    const overlay = findOpenOverlay();
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass('bg-charcoal-900/80');
    expect(overlay).not.toHaveClass('bg-black/80');
  });
});
