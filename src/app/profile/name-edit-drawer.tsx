'use client';

import AppDrawer from '@/components/ui/app-drawer';
import { buildHumanName } from '@/utils/fhir/human-name';
import type { FhirResourceType } from '@/utils/role-fhir';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useProfileSectionSave } from './hooks/useProfileSectionSave';

type Props = {
  /** Whether the drawer is open. */
  open: boolean;
  /** Closes the drawer; also called after a successful save. */
  onClose: () => void;
  /** The active role's FHIR resource id. */
  fhirId: string;
  /** The FHIR resource type backing the active role. */
  resourceType: FhirResourceType;
  /** Current given name parts (repeatable; middle names included). */
  given: string[];
  /** Current family name. */
  family?: string;
};

type NameRow = { id: number; value: string };

/**
 * Name edit drawer: repeatable given-name rows plus a single family field.
 * Saves through the generic section save with the identity sync enabled so
 * the session/header fullname stays in step with the FHIR resource.
 */
export default function NameEditDrawer({
  open,
  onClose,
  fhirId,
  resourceType,
  given,
  family
}: Readonly<Props>) {
  const [rows, setRows] = useState<NameRow[]>([{ id: 0, value: '' }]);
  const nextRowId = useRef(1);
  const [familyName, setFamilyName] = useState('');
  const { isSaving, saveSection } = useProfileSectionSave();

  useEffect(() => {
    if (open) {
      const initial = given.length > 0 ? given : [''];
      setRows(initial.map((value, index) => ({ id: index, value })));
      nextRowId.current = initial.length;
      setFamilyName(family ?? '');
    }
  }, [open, given, family]);

  /** Update one given-name row. */
  const handleGivenChange = (id: number, value: string) => {
    setRows(prev => prev.map(row => (row.id === id ? { ...row, value } : row)));
  };

  /** Append a blank given-name row. */
  const handleAddGiven = () => {
    setRows(prev => [...prev, { id: nextRowId.current++, value: '' }]);
  };

  /** Remove a given-name row. */
  const handleRemoveGiven = (id: number) => {
    setRows(prev => prev.filter(row => row.id !== id));
  };

  /** Save the name: merge a fresh HumanName into the resource and sync identity. */
  const handleSave = () => {
    const cleanGiven = rows.map(row => row.value.trim()).filter(Boolean);
    const cleanFamily = familyName.trim();
    if (cleanGiven.length === 0 && !cleanFamily) return;

    void saveSection({
      fhirId,
      resourceType,
      syncIdentity: true,
      merge: latest => ({
        ...latest,
        name: [buildHumanName(cleanGiven, cleanFamily || undefined)]
      }),
      onSuccess: onClose
    });
  };

  const hasNameParts =
    rows.some(row => row.value.trim()) || familyName.trim() !== '';

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title='Edit Name'
      description='Given names can include middle names.'
      ctaLabel='Save'
      ctaDisabled={isSaving || !hasNameParts}
      ctaLoading={isSaving}
      onCtaClick={() => handleSave()}
    >
      <div className='space-y-5 px-4 pb-4'>
        <div className='space-y-2'>
          <p className='text-xs font-semibold text-[#2C2F35]'>Given names</p>
          {rows.map(row => (
            <div key={row.id} className='flex items-center gap-2'>
              <input
                value={row.value}
                onChange={event =>
                  handleGivenChange(row.id, event.target.value)
                }
                data-testid={`given-${row.id}`}
                placeholder={`Given name ${row.id + 1}`}
                className='w-full rounded-xl border border-[#E3E3E3] px-3 py-2.5 text-sm outline-none focus:border-[#13C2C2]'
              />
              {rows.length > 1 && (
                <button
                  type='button'
                  onClick={() => handleRemoveGiven(row.id)}
                  data-testid={`remove-given-${row.id}`}
                  aria-label={`Remove given name ${row.id + 1}`}
                  className='text-secondary shrink-0 cursor-pointer'
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              )}
            </div>
          ))}
          <button
            type='button'
            onClick={handleAddGiven}
            data-testid='add-given'
            className='text-secondary flex cursor-pointer items-center gap-1 text-xs font-semibold'
          >
            <Plus className='h-4 w-4' />
            Add given name
          </button>
        </div>
        <div className='space-y-2'>
          <p className='text-xs font-semibold text-[#2C2F35]'>Family name</p>
          <input
            value={familyName}
            onChange={event => setFamilyName(event.target.value)}
            data-testid='family-input'
            placeholder='Family name'
            className='w-full rounded-xl border border-[#E3E3E3] px-3 py-2.5 text-sm outline-none focus:border-[#13C2C2]'
          />
        </div>
      </div>
    </AppDrawer>
  );
}
