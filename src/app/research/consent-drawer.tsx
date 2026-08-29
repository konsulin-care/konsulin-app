'use client';

import AppDrawer from '@/components/ui/app-drawer';
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
    <AppDrawer
      open={open}
      onClose={onClose}
      title='Informed Consent'
      description='Your participation in this research study.'
      ctaLabel='Agree to Participate'
      onCtaClick={onAgree}
    >
      <ConsentDrawerContent />
    </AppDrawer>
  );
}
