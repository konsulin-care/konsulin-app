'use client';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
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
 * Shows the questionnaire fee as the total to pay. Both Pay Now and Cancel
 * close the drawer — the payment backend is not implemented yet, so Pay Now
 * is a placeholder.
 */
export default function ReportPaymentDrawer({
  open,
  onOpenChange,
  fee
}: Props) {
  /** Closes the payment drawer. */
  const close = () => onOpenChange(false);
  return (
    <Drawer onClose={close} open={open}>
      <DrawerContent
        onInteractOutside={close}
        className='fixed right-0 bottom-0 left-0 mx-auto flex max-w-screen-sm flex-col bg-white p-4'
      >
        <div className='mt-2 flex items-center justify-between rounded-[12px] bg-[#F9F9F9] p-3'>
          <span className='text-[12px] text-[#666]'>Total</span>
          <span className='text-[16px] font-bold'>{formatFee(fee)}</span>
        </div>
        <div className='mt-2 flex flex-col gap-2'>
          <Button
            className='bg-secondary w-full rounded-xl text-white'
            onClick={close}
          >
            Pay Now
          </Button>
          <Button
            variant='outline'
            className='w-full rounded-xl border-0'
            onClick={close}
          >
            Cancel
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
