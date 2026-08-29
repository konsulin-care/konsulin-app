'use client';

import AppDrawer from '@/components/ui/app-drawer';
import { formatFee } from '@/utils/fhir/fee';
import type { Money } from 'fhir/r4';

type Props = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly fee: Money;
};

/**
 * Payment drawer for the "Get Report" assessment flow.
 *
 * Shows the questionnaire fee as the total to pay with a single Pay Now
 * CTA that closes the drawer — the payment backend is not implemented
 * yet, so Pay Now is a placeholder.
 */
export default function ReportPaymentDrawer({
  open,
  onOpenChange,
  fee
}: Props) {
  /** Closes the payment drawer. */
  const close = () => onOpenChange(false);
  return (
    <AppDrawer
      open={open}
      onClose={close}
      ctaLabel='Pay Now'
      onCtaClick={close}
    >
      <div className='mt-2 flex items-center justify-between rounded-[12px] bg-[#F9F9F9] p-3'>
        <span className='text-[12px] text-[#666]'>Total</span>
        <span className='text-[16px] font-bold'>{formatFee(fee)}</span>
      </div>
    </AppDrawer>
  );
}
