'use client';

import AppDrawer from '@/components/ui/app-drawer';
import { useTranslations } from '@/i18n';
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
  const t = useTranslations('research');
  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={t('consent_title')}
      description={t('consent_description')}
      ctaLabel={t('consent_cta')}
      onCtaClick={onAgree}
    >
      <ConsentDrawerContent />
    </AppDrawer>
  );
}
