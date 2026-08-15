'use client';

import AppDrawer from '@/components/ui/app-drawer';
import type { FhirResourceType } from '@/utils/role-fhir';
import { useEffect, useState } from 'react';
import { useProfileSectionSave } from './hooks/useProfileSectionSave';
import { mergeContact } from './section-merge';

type Props = {
  /** Whether the drawer is open. */
  open: boolean;
  /** Closes the drawer; also called after a successful save. */
  onClose: () => void;
  /** The active role's FHIR resource id. */
  fhirId: string;
  /** The FHIR resource type backing the active role. */
  resourceType: FhirResourceType;
  /** Current email address. */
  email: string;
  /** Current phone number. */
  phone: string;
  /** Email is read-only for email-based users (identity comes from login). */
  isEmailBased: boolean;
};

/**
 * Contact drawer: email and phone. Email is read-only when the account is
 * email-based, since it anchors the login identity.
 */
export default function ContactEditDrawer({
  open,
  onClose,
  fhirId,
  resourceType,
  email,
  phone,
  isEmailBased
}: Readonly<Props>) {
  const [emailValue, setEmailValue] = useState(email);
  const [phoneValue, setPhoneValue] = useState(phone);
  const { isSaving, saveSection } = useProfileSectionSave();

  useEffect(() => {
    if (open) {
      setEmailValue(email);
      setPhoneValue(phone);
    }
  }, [open, email, phone]);

  /** Save email and phone into a fresh telecom array. */
  const handleSave = () => {
    void saveSection({
      fhirId,
      resourceType,
      syncIdentity: true,
      merge: latest =>
        mergeContact(latest, { email: emailValue, phone: phoneValue }),
      onSuccess: onClose
    });
  };

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title='Contact'
      description='Email and phone used for communication.'
      ctaLabel='Save'
      ctaDisabled={isSaving}
      ctaLoading={isSaving}
      onCtaClick={() => handleSave()}
    >
      <div className='space-y-5 px-4 pb-4'>
        <div className='space-y-2'>
          <p className='text-xs font-semibold text-[#2C2F35]'>Email</p>
          <input
            value={emailValue}
            onChange={event => setEmailValue(event.target.value)}
            readOnly={isEmailBased}
            data-testid='email-input'
            type='email'
            placeholder='Email address'
            className='w-full rounded-xl border border-[#E3E3E3] px-3 py-2.5 text-sm outline-none focus:border-[#13C2C2]'
          />
        </div>
        <div className='space-y-2'>
          <p className='text-xs font-semibold text-[#2C2F35]'>Phone</p>
          <input
            value={phoneValue}
            onChange={event => setPhoneValue(event.target.value)}
            data-testid='phone-input'
            type='tel'
            placeholder='Phone number'
            className='w-full rounded-xl border border-[#E3E3E3] px-3 py-2.5 text-sm outline-none focus:border-[#13C2C2]'
          />
        </div>
      </div>
    </AppDrawer>
  );
}
