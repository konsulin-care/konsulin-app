'use client';

import LocationCombobox, {
  type ComboboxOption
} from '@/components/shared/location-combobox';
import { NUCC_TAXONOMY } from '@/data/nucc-taxonomy';
import { useUpdatePractitionerInfo } from '@/services/clinicians';
import { FhirSystems } from '@/utils/fhir/extensions';
import {
  buildSpecialtyPayload,
  getNuccSpecialtyCodes
} from '@/utils/fhir/specialty';
import type { PractitionerRole } from 'fhir/r4';
import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  readonly practitionerRole: PractitionerRole;
  /** Reports dirty state and save handler for the shell's FAB coordination. */
  readonly onDirtyChange?: (
    dirty: boolean,
    save: () => Promise<void>,
    saving: boolean
  ) => void;
};

/** Picker options: searchable by code, grouped by NUCC classification. */
const NUCC_OPTIONS: ComboboxOption[] = NUCC_TAXONOMY.map(entry => ({
  code: entry.code,
  name: entry.label,
  group: entry.classification,
  searchText: `${entry.code} ${entry.label} ${entry.classification} ${entry.specialization}`
}));

/** Compare two code arrays by membership and order. */
function sameCodes(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((code, index) => code === b[index]);
}

/** Human-readable fallback for an external specialty concept. */
function externalLabel(
  concept: NonNullable<PractitionerRole['specialty']>[number]
): string {
  return concept.text ?? concept.coding?.[0]?.display ?? 'External specialty';
}

/**
 * NUCC taxonomy specialty editor for a PractitionerRole.
 *
 * Multi-select picker over the generated NUCC_TAXONOMY data with removable
 * chips. External (non-NUCC) specialties are rendered read-only and survive
 * saves untouched. Reports dirty state and a save handler to the shell via
 * onDirtyChange, following the PractitionerAvailabilityEditor contract.
 */
export default function SpecialtySection({
  practitionerRole,
  onDirtyChange
}: Props) {
  const [selectedCodes, setSelectedCodes] = useState<string[]>(() =>
    getNuccSpecialtyCodes(practitionerRole)
  );
  const [isSaving, setIsSaving] = useState(false);
  const { mutateAsync: updatePractitionerInfo } = useUpdatePractitionerInfo();

  const savedBaselineRef = useRef<string[]>(
    getNuccSpecialtyCodes(practitionerRole)
  );
  const dirty = !sameCodes(selectedCodes, savedBaselineRef.current);

  const labelByCode = useMemo(
    () => new Map(NUCC_TAXONOMY.map(entry => [entry.code, entry.label])),
    []
  );

  // External concepts are preserved by buildSpecialtyPayload; render them
  // read-only so users understand they are not managed here.
  const externalConcepts = useMemo(
    () =>
      (practitionerRole.specialty ?? []).filter(
        concept =>
          !concept.coding?.some(
            coding => coding.system === FhirSystems.nuccTaxonomy
          )
      ),
    [practitionerRole]
  );

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const payload = buildSpecialtyPayload(practitionerRole, selectedCodes);
      await updatePractitionerInfo({ ...practitionerRole, specialty: payload });
      savedBaselineRef.current = [...selectedCodes];
    } catch (error) {
      console.error('Failed to update specialties:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Stable ref so the onDirtyChange effect never closes over stale state.
  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;

  // Report dirty state with a save wrapper that reads saveRef at call time.
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(dirty, () => saveRef.current(), isSaving);
    }
  }, [dirty, isSaving, onDirtyChange]);

  const handleToggle = (codes: string[]): void => {
    setSelectedCodes(codes);
  };

  const handleRemove = (code: string): void => {
    setSelectedCodes(prev => prev.filter(c => c !== code));
  };

  return (
    <div className='flex flex-col gap-4 px-4 py-2'>
      <p className='text-muted-foreground text-sm'>
        Specialties tell patients which conditions you treat and drive
        patient-facing recommendations. External specialties added outside this
        app are kept as-is.
      </p>

      <LocationCombobox
        multiple
        options={NUCC_OPTIONS}
        value={selectedCodes}
        onSelect={handleToggle}
        placeholder='Add specialty…'
      />

      <div className='flex flex-wrap gap-2'>
        {selectedCodes.map(code => {
          const label = labelByCode.get(code) ?? code;
          return (
            <span
              key={code}
              className='border-input bg-muted/50 text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm'
            >
              <span className='max-w-[16rem] truncate'>{label}</span>
              <span className='text-muted-foreground text-xs'>{code}</span>
              <button
                type='button'
                aria-label={`Remove ${label}`}
                onClick={() => handleRemove(code)}
                className='text-muted-foreground hover:text-foreground ml-0.5 rounded-full p-0.5'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            </span>
          );
        })}

        {externalConcepts.map(concept => (
          <span
            key={`external-${externalLabel(concept)}`}
            className='border-input bg-background text-muted-foreground flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 text-sm'
          >
            {externalLabel(concept)}
          </span>
        ))}
      </div>
    </div>
  );
}
