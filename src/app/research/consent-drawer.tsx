'use client';

import { Drawer } from '@/components/ui/drawer';
import ConsentDrawerContent from './consent-drawer-content';

interface ConsentDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onAgree: () => void;
}

/**
 * Drawer showing the study informed consent with a single
 * "Agree to Participate" CTA.
 */
export default function ConsentDrawer({
  open,
  onClose,
  onAgree
}: ConsentDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      <ConsentDrawerContent onAgree={onAgree} />
    </Drawer>
  );
}
