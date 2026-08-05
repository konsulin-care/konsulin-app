'use client';

import { Button } from '@/components/ui/button';
import {
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';

interface ConsentDrawerContentProps {
  readonly onAgree: () => void;
}

/** Informed consent copy and the single Agree CTA of the consent drawer. */
export default function ConsentDrawerContent({
  onAgree
}: ConsentDrawerContentProps) {
  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Informed Consent</DrawerTitle>
        <DrawerDescription>
          Your participation in this research study.
        </DrawerDescription>
      </DrawerHeader>

      <div className='space-y-3 px-4 text-xs leading-5 text-gray-600'>
        <p>
          Participation is voluntary. Your data is processed in pseudonymized
          form: you are assigned a random participant ID so you can track your
          contributions, and researchers cannot access your personal identifying
          information.
        </p>
        <p className='font-bold text-gray-800'>By agreeing to participate:</p>
        <ul className='list-disc space-y-1 pl-4'>
          <li>
            Every questionnaire you complete counts toward the ongoing study.
          </li>
          <li>
            Each batch runs for a fixed period with a small questionnaire set.
          </li>
          <li>
            Completing a batch before it closes maintains your participation
            streak.
          </li>
        </ul>
        <p>
          Referral patterns from sharing this study with friends and colleagues
          are used only to reconstruct the network structure of the research
          community.
        </p>
        <p>
          You can review your data, withdraw your consent, or request deletion
          at any time, in accordance with the GDPR and Indonesia&apos;s Personal
          Data Protection Law (UU PDP). Withdrawal does not affect processing
          carried out before withdrawal.
        </p>
      </div>

      <DrawerFooter>
        <Button
          type='button'
          variant='secondary'
          className='text-white'
          onClick={onAgree}
        >
          Agree to Participate
        </Button>
      </DrawerFooter>
    </DrawerContent>
  );
}
