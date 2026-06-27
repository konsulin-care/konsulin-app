'use client';

import { useClinicContext } from '@/hooks/useClinicContext';
import { submitFhirBundle } from '@/services/api/fhir-bundle';
import { usePractitionerRoleHealthcareServices } from '@/services/clinic';
import type { Bundle, HealthcareService } from 'fhir/r4';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ServiceFormDrawer from './service-form-drawer';

type Props = {
  practitionerRoleId?: string;
};

/**
 * Tab content for managing HealthcareService resources.
 *
 * Maintains a local copy of services for create/edit/delete operations.
 * "Save All" builds a FHIR transaction bundle and submits via submitFhirBundle.
 */
export default function ServicesTab({ practitionerRoleId }: Props) {
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
    setLocalServices(prev => {
      const existingIdx = prev.findIndex(s => s.id === service.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = service;
        return updated;
      }
      return [...prev, service];
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
          // PUT PractitionerRole with updated healthcareService refs
          {
            resource: {
              resourceType: 'PractitionerRole',
              id: practitionerRoleId,
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
  }, [localServices, practitionerRoleId, refetch]);

  if (!localServices || localServices.length === 0) {
    return (
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
          className='card rounded-lg border border-gray-200 bg-white p-4'
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
                onClick={() => handleEditService(svc)}
                className='text-xs text-blue-600 underline'
              >
                Edit
              </button>
              {svc.id && (
                <button
                  onClick={() => {
                    if (svc.id) handleDeleteService(svc.id);
                  }}
                  className='text-xs text-red-600 underline'
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {isDirty && (
        <div className='flex justify-end pt-4'>
          <button
            onClick={() => {
              handleSaveAll().catch(console.error);
            }}
            disabled={saveAllLoading}
            className='bg-primary rounded px-6 py-2 text-sm font-bold text-white disabled:opacity-50'
          >
            {saveAllLoading ? 'Saving...' : 'Save All'}
          </button>
        </div>
      )}

      <ServiceFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingService(undefined);
        }}
        onSave={handleDrawerSave}
        service={editingService}
        providedBy={`Organization/${clinicId}`}
        location={`Location/${locationId}`}
      />
    </div>
  );
}
