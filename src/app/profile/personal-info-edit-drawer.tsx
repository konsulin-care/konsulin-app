'use client';

import DobInput from '@/components/profile/dob-input';
import AppDrawer from '@/components/ui/app-drawer';
import { genderList, languageOptions } from '@/constants/profile';
import type { FhirResourceType } from '@/utils/role-fhir';
import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
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

/** Labeled field wrapper used by every personal-info field. */
function Field({
  label,
  children
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className='space-y-2'>
      <p className='text-xs font-semibold text-[#2C2F35]'>{label}</p>
      {children}
    </div>
  );
}

/** Labeled select control with shared styling. */
function SelectField({
  label,
  value,
  onChange,
  testId,
  children
}: Readonly<{
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  testId: string;
  children: ReactNode;
}>) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={onChange}
        data-testid={testId}
        className='w-full rounded-xl border border-[#E3E3E3] px-3 py-2.5 text-sm outline-none focus:border-[#13C2C2]'
      >
        {children}
      </select>
    </Field>
  );
}

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
}: Readonly<Props>) {
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

  /** Save gender, DOB and (when supported) language. */
  const handleSave = () => {
    if (!genderValue || !dobValue) return;
    const selected = languageOptions.find(
      option => option.code === languageValue
    );
    // skipcq: JS-0098 - fire-and-forget save; errors handled inside the hook
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
      onCtaClick={handleSave}
    >
      <div className='space-y-5 px-4 pb-4'>
        <SelectField
          label='Gender'
          value={genderValue}
          testId='gender-select'
          onChange={event => {
            setGenderValue(event.target.value);
          }}
        >
          <option value='' disabled>
            Select gender
          </option>
          {genderList.map(option => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </SelectField>

        <Field label='Date of Birth'>
          <DobInput value={dobValue} onChange={setDobValue} />
        </Field>

        {supportsLanguage && (
          <SelectField
            label='Language'
            value={languageValue}
            testId='language-select'
            onChange={event => {
              setLanguageValue(event.target.value);
            }}
          >
            <option value='' disabled>
              Select language
            </option>
            {languageOptions.map(option => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </SelectField>
        )}
      </div>
    </AppDrawer>
  );
}
