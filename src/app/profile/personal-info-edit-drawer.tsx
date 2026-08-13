'use client';

import DobCalendar from '@/components/profile/dob-calendar';
import AppDrawer from '@/components/ui/app-drawer';
import { genderList, languageOptions } from '@/constants/profile';
import type { FhirResourceType } from '@/utils/role-fhir';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useProfileSectionSave } from './hooks/useProfileSectionSave';
import { mergePersonalInfo, mergePersonalInfoSync } from './section-merge';

type Props = {
  /** Whether the drawer is open. */
  open: boolean;
  /** Closes the drawer; also called after a successful save. */
  onClose: () => void;
  /** The active role's FHIR resource id. */
  fhirId: string;
  /** The FHIR resource type backing the active role. */
  resourceType: FhirResourceType;
  /** Current gender value (male/female/other/unknown). */
  gender: string;
  /** Current birthDate in yyyy-MM-dd. */
  birthDate: string;
  /** Current BCP-47 language code, when the role supports one. */
  languageCode?: string;
  /** False for Person-based roles, which have no language field. */
  supportsLanguage: boolean;
};

/**
 * Personal information drawer: gender, date of birth and communication
 * language (Patient/Practitioner only). Saves atomically via the generic
 * section save hook.
 */
export default function PersonalInfoEditDrawer({
  open,
  onClose,
  fhirId,
  resourceType,
  gender,
  birthDate,
  languageCode,
  supportsLanguage
}: Props) {
  const [genderValue, setGenderValue] = useState(gender);
  const [dobValue, setDobValue] = useState(birthDate);
  const [languageValue, setLanguageValue] = useState(languageCode ?? '');
  const { isSaving, saveSection } = useProfileSectionSave();

  useEffect(() => {
    if (open) {
      setGenderValue(gender);
      setDobValue(birthDate);
      setLanguageValue(languageCode ?? '');
    }
  }, [open, gender, birthDate, languageCode]);

  /** Handle date selection from the calendar. */
  const handleDobChange = (date: Date) => {
    setDobValue(format(date, 'yyyy-MM-dd'));
  };

  /** Save gender, DOB and (when supported) language. */
  const handleSave = () => {
    if (!genderValue || !dobValue) return;
    const selected = languageOptions.find(
      option => option.code === languageValue
    );
    void saveSection({
      fhirId,
      resourceType,
      merge: latest =>
        mergePersonalInfo(latest, {
          gender: genderValue,
          birthDate: dobValue,
          ...(supportsLanguage && selected
            ? {
                languageCode: selected.code,
                languageLabel: selected.label
              }
            : {})
        }),
      // Language stays per role: other roles receive gender/DOB only.
      mergeOtherRoles: latest =>
        mergePersonalInfoSync(latest, {
          gender: genderValue,
          birthDate: dobValue
        }),
      onSuccess: onClose
    });
  };

  const isValid = Boolean(genderValue) && Boolean(dobValue);

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title='Personal Information'
      description='Gender, date of birth and preferred language.'
      ctaLabel='Save'
      ctaDisabled={isSaving || !isValid}
      ctaLoading={isSaving}
      onCtaClick={() => handleSave()}
    >
      <div className='space-y-5 px-4 pb-4'>
        <div className='space-y-2'>
          <p className='text-xs font-semibold text-[#2C2F35]'>Gender</p>
          <select
            value={genderValue}
            onChange={event => setGenderValue(event.target.value)}
            data-testid='gender-select'
            className='w-full rounded-xl border border-[#E3E3E3] px-3 py-2.5 text-sm outline-none focus:border-[#13C2C2]'
          >
            <option value='' disabled>
              Select gender
            </option>
            {genderList.map(option => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className='space-y-2'>
          <p className='text-xs font-semibold text-[#2C2F35]'>Date of Birth</p>
          <DobCalendar
            value={dobValue ? new Date(dobValue) : null}
            onChange={handleDobChange}
          />
        </div>

        {supportsLanguage && (
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-[#2C2F35]'>Language</p>
            <select
              value={languageValue}
              onChange={event => setLanguageValue(event.target.value)}
              data-testid='language-select'
              className='w-full rounded-xl border border-[#E3E3E3] px-3 py-2.5 text-sm outline-none focus:border-[#13C2C2]'
            >
              <option value='' disabled>
                Select language
              </option>
              {languageOptions.map(option => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </AppDrawer>
  );
}
