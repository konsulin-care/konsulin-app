'use client';

import { useClinicContext } from '@/hooks/useClinicContext';
import { submitFhirBundle } from '@/services/api/fhir-bundle';
import { usePractitionerRoleHealthcareServices } from '@/services/clinic';
import type { Bundle, HealthcareService, PractitionerRole } from 'fhir/r4';
import { Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ServiceFormDrawer from './service-form-drawer';

type Props = {
  practitionerRoleId?: string;
  /** Reports dirty state and save handler to parent (for external FAB management). */
  onDirtyChange?: (
    dirty: boolean,
    save: () => Promise<void>,
    saving: boolean
  ) => void;
  /** Full PractitionerRole resource to preserve all fields on save.
   *  When provided, the bundle PUT includes all existing fields (practitioner,
   *  organization, availableTime, etc.) instead of only healthcareService. */
  practitionerRole?: PractitionerRole;
};

/**
 * Tab content for managing HealthcareService resources.
 *
 * Maintains a local copy of services for create/edit/delete operations.
 * "Save All" builds a FHIR transaction bundle and submits via submitFhirBundle.
 */
export default function ServicesTab({
  practitionerRoleId,
  onDirtyChange,
  practitionerRole
}: Props) {
  const { clinicId, locationId } = useClinicContext();
  const { data: fetchedServices, refetch } =
    usePractitionerRoleHealthcareServices(practitionerRoleId ?? '');

  const [localServices, setLocalServices] = useState<HealthcareService[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<
    HealthcareService | undefined
  >();
  const [saveAllLoading, setSaveAllLoading] = useState(false);

  // Sync local state from fetched data
  useEffect(() => {
    if (fetchedServices) {
      setLocalServices(fetchedServices);
    }
  }, [fetchedServices]);

  const isDirty = useMemo(() => {
    if (!fetchedServices) return localServices.length > 0;
    if (localServices.length !== fetchedServices.length) return true;
    return localServices.some((s, i) => {
      const f = fetchedServices[i];
      return (
        s.name !== f.name ||
        s.active !== f.active ||
        s.extraDetails !== f.extraDetails
      );
    });
  }, [localServices, fetchedServices]);

  const handleAddService = () => {
    setEditingService(undefined);
    setDrawerOpen(true);
  };

  const handleEditService = (svc: HealthcareService) => {
    setEditingService(svc);
    setDrawerOpen(true);
  };

  const handleDeleteService = (id: string) => {
    setLocalServices(prev => prev.filter(s => s.id !== id));
  };

  const handleDrawerSave = (service: HealthcareService) => {
    // Generate a temp client ID so new services (id: undefined) can be
    // distinguished in the local array. Without this, findIndex matches
    // the first service with undefined id and replaces it.
    const serviceWithId: HealthcareService = {
      ...service,
      id: service.id ?? `new-${crypto.randomUUID()}`
    };

    setLocalServices(prev => {
      const existingIdx = prev.findIndex(s => s.id === serviceWithId.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = serviceWithId;
        return updated;
      }
      return [...prev, serviceWithId];
    });
    setDrawerOpen(false);
    setEditingService(undefined);
  };

  const handleSaveAll = useCallback(async () => {
    if (!practitionerRoleId) return;
    setSaveAllLoading(true);

    try {
      const bundle: Bundle = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          // POST/PUT for each HealthcareService
          ...localServices.map(svc => ({
            resource: svc,
            request: {
              method: svc.id ? ('PUT' as const) : ('POST' as const),
              url: svc.id ? `HealthcareService/${svc.id}` : 'HealthcareService'
            }
          })),
          // PUT PractitionerRole with updated healthcareService refs,
          // preserving all existing fields (practitioner, organization, etc.)
          {
            resource: {
              ...(practitionerRole ?? {
                resourceType: 'PractitionerRole',
                id: practitionerRoleId
              }),
              healthcareService: localServices
                .filter((s): s is HealthcareService & { id: string } =>
                  Boolean(s.id)
                )
                .map(s => ({ reference: `HealthcareService/${s.id}` }))
            } as unknown as HealthcareService,
            request: {
              method: 'PUT' as const,
              url: `PractitionerRole/${practitionerRoleId}`
            }
          }
        ]
      };

      await submitFhirBundle(bundle);
      await refetch();
    } catch (error) {
      console.error('Failed to save services:', error);
    } finally {
      setSaveAllLoading(false);
    }
  }, [localServices, practitionerRoleId, refetch, practitionerRole]);

  // Report dirty state to parent for dynamic FAB
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty, handleSaveAll, saveAllLoading);
    }
  }, [isDirty, saveAllLoading, onDirtyChange, handleSaveAll]);

  if (!localServices || localServices.length === 0) {
    return (
      <>
        <div className='py-8 text-center text-sm text-gray-500'>
          No healthcare services configured.
          <br />
          <button
            onClick={handleAddService}
            className='text-primary mt-2 underline'
          >
            Add Service
          </button>
        </div>
        <ServiceFormDrawer
          key={editingService?.id ?? 'create'}
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setEditingService(undefined);
          }}
          onSave={handleDrawerSave}
          service={editingService}
          providedBy={`Organization/${clinicId}`}
          location={locationId ? `Location/${locationId}` : undefined}
        />
      </>
    );
  }

  return (
    <div className='space-y-3 py-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-bold'>
          Healthcare Services ({localServices.length})
        </h3>
        <button
          onClick={handleAddService}
          className='text-primary text-sm underline'
        >
          + Add Service
        </button>
      </div>

      {localServices.map((svc: HealthcareService) => (
        <div
          key={svc.id ?? svc.name}
          onClick={() => handleEditService(svc)}
          className='card cursor-pointer rounded-lg border border-gray-200 bg-white p-4'
        >
          <div className='flex items-start justify-between'>
            <div className='flex-1'>
              <div className='text-sm font-bold'>
                {svc.active !== false && (
                  <span className='mr-2 inline-block h-2 w-2 rounded-full bg-green-500' />
                )}
                {svc.name}
              </div>
              {svc.extraDetails && (
                <div className='mt-1 text-xs text-gray-500'>
                  {svc.extraDetails}
                </div>
              )}
            </div>
            <div className='flex gap-2'>
              <button
                aria-label='Edit service'
                onClick={e => {
                  e.stopPropagation();
                  handleEditService(svc);
                }}
                className='text-black'
              >
                <Pencil size={16} />
              </button>
              {svc.id && (
                <button
                  aria-label='Delete service'
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteService(svc.id);
                  }}
                  className='text-xs text-red-600 underline'
                >
                  <Trash2 size={16} className='text-red-500' />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <ServiceFormDrawer
        key={editingService?.id ?? 'create'}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingService(undefined);
        }}
        onSave={handleDrawerSave}
        service={editingService}
        providedBy={`Organization/${clinicId}`}
        location={locationId ? `Location/${locationId}` : undefined}
      />
    </div>
  );
}
