'use client';

import { useClinicContext } from '@/hooks/useClinicContext';
import { submitFhirBundle } from '@/services/api/fhir-bundle';
import { usePractitionerRoleHealthcareServices } from '@/services/clinic';
import { useFabSelection } from '@/context/fabSelectionContext';
import type { Bundle, HealthcareService, PractitionerRole } from 'fhir/r4';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ServiceFormDrawer from './service-form-drawer';

type Props = {
  readonly practitionerRoleId?: string;
  readonly onDirtyChange?: (
    dirty: boolean,
    save: () => Promise<void>,
    saving: boolean
  ) => void;
  readonly practitionerRole?: PractitionerRole;
};

/**
 * Tab for managing HealthcareService resources.
 * Supports multi-select: right-click/long-press to select cards,
 * then batch-delete via contextual FAB action.
 */
export default function ServicesTab({
  practitionerRoleId,
  onDirtyChange,
  practitionerRole
}: Props) {
  const { clinicId } = useClinicContext();
  const { data: fetchedServices, refetch } =
    usePractitionerRoleHealthcareServices(practitionerRoleId ?? '');

  const [localServices, setLocalServices] = useState<HealthcareService[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<
    HealthcareService | undefined
  >();
  const [saveAllLoading, setSaveAllLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const { setSelectionState } = useFabSelection();

  useEffect(() => {
    if (fetchedServices) setLocalServices(fetchedServices);
  }, [fetchedServices]);

  const isDirty = useMemo(() => {
    if (!fetchedServices) return localServices.length > 0;
    if (localServices.length !== fetchedServices.length) return true;
    return localServices.some((s, i) => {
      const f = fetchedServices.at(i);
      return (
        s.name !== f.name ||
        s.active !== f.active ||
        s.extraDetails !== f.extraDetails ||
        JSON.stringify(s.extension) !== JSON.stringify(f.extension)
      );
    });
  }, [localServices, fetchedServices]);

  const inSelectionMode = selectedIds.size > 0;

  const toggleSelection = useCallback((id: string | undefined) => {
    if (!id) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCardClick = useCallback(
    (svc: HealthcareService) => {
      if (inSelectionMode) toggleSelection(svc.id);
      else {
        setEditingService(svc);
        setDrawerOpen(true);
      }
    },
    [inSelectionMode, toggleSelection]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, svc: HealthcareService) => {
      e.preventDefault();
      toggleSelection(svc.id);
    },
    [toggleSelection]
  );

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  const handleTouchStart = useCallback(
    (_e: React.TouchEvent, svc: HealthcareService) => {
      isLongPress.current = false;
      clearLongPress();
      longPressTimer.current = setTimeout(() => { isLongPress.current = true; toggleSelection(svc.id); }, 500);
    },
    [clearLongPress, toggleSelection]
  );

  const handleTouchMove = useCallback(() => clearLongPress(), [clearLongPress]);

  const handleTouchEnd = useCallback(
    (svc: HealthcareService) => {
      clearLongPress();
      if (!isLongPress.current) {
        if (inSelectionMode) toggleSelection(svc.id);
        else {
          setEditingService(svc);
          setDrawerOpen(true);
        }
      }
      isLongPress.current = false;
    },
    [clearLongPress, inSelectionMode, toggleSelection]
  );

  const handleSelectionDelete = useCallback(() => {
    setLocalServices(prev =>
      prev.filter(s => !selectedIds.has(s.id ?? ''))
    );
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleSelectionCancel = useCallback(() => setSelectedIds(new Set()), []);

  useEffect(() => {
    if (inSelectionMode) {
      setSelectionState({
        count: selectedIds.size,
        onDelete: handleSelectionDelete,
        onCancel: handleSelectionCancel
      });
    } else {
      setSelectionState(null);
    }
  }, [inSelectionMode, selectedIds, setSelectionState, handleSelectionDelete, handleSelectionCancel]);

  const handleAddService = () => {
    setEditingService(undefined);
    setDrawerOpen(true);
  };

  const handleDrawerSave = (service: HealthcareService) => {
    const serviceWithId: HealthcareService = {
      ...service,
      id: service.id ?? `new-${crypto.randomUUID()}`
    };
    setLocalServices(prev => {
      const idx = prev.findIndex(s => s.id === serviceWithId.id);
      return idx === -1 ? [...prev, serviceWithId] : prev.with(idx, serviceWithId);
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
          ...localServices.map(svc => ({
            resource: svc,
            request: {
              method: svc.id ? ('PUT' as const) : ('POST' as const),
              url: svc.id ? `HealthcareService/${svc.id}` : 'HealthcareService'
            }
          })),
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
    } catch { /* errors handled internally */ } finally {
      setSaveAllLoading(false);
    }
  }, [localServices, practitionerRoleId, refetch, practitionerRole]);

  useEffect(() => {
    if (onDirtyChange) onDirtyChange(isDirty, handleSaveAll, saveAllLoading);
  }, [isDirty, saveAllLoading, onDirtyChange, handleSaveAll]);

  if (localServices.length === 0) {
    return (
      <>
        <div className='py-8 text-center text-sm text-gray-500'>
          No healthcare services configured.
          <br />
          <button onClick={handleAddService} className='text-primary mt-2 underline'>
            Add Service
          </button>
        </div>
        <ServiceFormDrawer
          key={editingService?.id ?? 'create'}
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setEditingService(undefined); }}
          onSave={handleDrawerSave}
          service={editingService}
          providedBy={`Organization/${clinicId}`}
          location={undefined}
        />
      </>
    );
  }

  return (
    <div className='space-y-3 py-4'>
      <div className='flex items-center justify-between'>
        {inSelectionMode ? (
          <h3 className='text-sm font-bold'>
            {selectedIds.size} selected —{' '}
            <button onClick={handleSelectionCancel} className='text-primary underline'>
              Cancel
            </button>
          </h3>
        ) : (
          <h3 className='text-sm font-bold'>
            Healthcare Services ({localServices.length})
          </h3>
        )}
        {!inSelectionMode && (
          <button onClick={handleAddService} className='text-primary text-sm underline'>
            + Add Service
          </button>
        )}
      </div>

      {localServices.map((svc: HealthcareService) => {
        const isSelected = svc.id ? selectedIds.has(svc.id) : false;
        return (
          <div key={svc.id ?? svc.name} className='relative'>
            <button
              type='button'
              onClick={() => handleCardClick(svc)}
              onContextMenu={e => handleContextMenu(e, svc)}
              onTouchStart={e => handleTouchStart(e, svc)}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd(svc)}
              className={`card w-full cursor-pointer rounded-lg border p-4 text-left ${
                isSelected
                  ? 'border-primary-500 ring-2 ring-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white'
              }`}
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
                    <div className='mt-1 text-xs text-gray-500'>{svc.extraDetails}</div>
                  )}
                </div>
              </div>
            </button>
          </div>
        );
      })}

      <ServiceFormDrawer
        key={editingService?.id ?? 'create'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingService(undefined); }}
        onSave={handleDrawerSave}
        service={editingService}
        providedBy={`Organization/${clinicId}`}
        location={undefined}
      />
    </div>
  );
}
