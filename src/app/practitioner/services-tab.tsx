'use client';

import ServiceCard from '@/components/practitioner/service-card';
import { useFabSelection } from '@/context/fabSelectionContext';
import { useClinicContext } from '@/hooks/useClinicContext';
import { submitFhirBundle } from '@/services/api/fhir-bundle';
/* eslint-disable max-lines */
/* reason: file contains multiple hook definitions and test utilities */
import { usePractitionerRoleHealthcareServices } from '@/services/clinic-practitioners';
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
  const [editingService, setEditingService] =
    useState<HealthcareService | null>(null);
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
    return localServices.some((localService, i) => {
      const fetchedService = fetchedServices.at(i);
      return (
        localService.name !== fetchedService.name ||
        localService.active !== fetchedService.active ||
        localService.extraDetails !== fetchedService.extraDetails ||
        JSON.stringify(localService.extension) !==
          JSON.stringify(fetchedService.extension)
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
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (_e: React.TouchEvent, svc: HealthcareService) => {
      isLongPress.current = false;
      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        toggleSelection(svc.id);
      }, 500);
    },
    [clearLongPress, toggleSelection]
  );

  const handleTouchMove = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

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
    setLocalServices(prev => prev.filter(s => !selectedIds.has(s.id ?? '')));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleSelectionCancel = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

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
  }, [
    inSelectionMode,
    selectedIds,
    setSelectionState,
    handleSelectionDelete,
    handleSelectionCancel
  ]);

  /** Open the service form drawer in create mode. */
  const handleAddService = () => {
    setEditingService(null);
    setDrawerOpen(true);
  };

  /** Save or update a healthcare service in local state. */
  const handleDrawerSave = (service: HealthcareService) => {
    const serviceWithId: HealthcareService = {
      ...service,
      id: service.id ?? `new-${crypto.randomUUID()}`
    };
    setLocalServices(prev => {
      const idx = prev.findIndex(s => s.id === serviceWithId.id);
      return idx === -1
        ? [...prev, serviceWithId]
        : prev.with(idx, serviceWithId);
    });
    setDrawerOpen(false);
    setEditingService(null);
  };

  const handleSaveAll = useCallback(async () => {
    if (!practitionerRoleId) return;
    setSaveAllLoading(true);
    try {
      const bundle: Bundle = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          ...localServices.map(svc => {
            const isNew = svc.id?.startsWith('new-');
            if (isNew) {
              const { id, ...bodyWithoutId } = svc;
              const uuid = id.replace('new-', '');
              return {
                fullUrl: `urn:uuid:${uuid}`,
                resource: bodyWithoutId,
                request: {
                  method: 'POST' as const,
                  url: 'HealthcareService'
                } as const
              };
            }
            return {
              resource: svc,
              request: {
                method: 'PUT' as const,
                url: `HealthcareService/${svc.id}`
              }
            };
          }),
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
                .map(s => ({
                  reference: s.id.startsWith('new-')
                    ? `urn:uuid:${s.id.replace('new-', '')}`
                    : `HealthcareService/${s.id}`
                }))
            },
            request: {
              method: 'PUT' as const,
              url: `PractitionerRole/${practitionerRoleId}`
            }
          }
        ]
      };
      await submitFhirBundle(bundle);
      await refetch();
    } catch (err) {
      console.warn('[services-tab] save failed', err);
    } finally {
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
            setEditingService(null);
          }}
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
            <button
              onClick={handleSelectionCancel}
              className='text-primary underline'
            >
              Cancel
            </button>
          </h3>
        ) : (
          <h3 className='text-sm font-bold'>
            Healthcare Services ({localServices.length})
          </h3>
        )}
        {!inSelectionMode && (
          <button
            onClick={handleAddService}
            className='text-primary text-sm underline'
          >
            + Add Service
          </button>
        )}
      </div>

      {localServices.map((svc: HealthcareService) => {
        const isSelected = svc.id ? selectedIds.has(svc.id) : false;
        return (
          <div key={svc.id ?? svc.name} className='relative'>
            <ServiceCard
              service={svc}
              isSelected={isSelected}
              onClick={() => {
                handleCardClick(svc);
              }}
              onContextMenu={e => {
                handleContextMenu(e, svc);
              }}
              onTouchStart={e => {
                handleTouchStart(e, svc);
              }}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => {
                handleTouchEnd(svc);
              }}
            />
          </div>
        );
      })}

      <ServiceFormDrawer
        key={editingService?.id ?? 'create'}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingService(null);
        }}
        onSave={handleDrawerSave}
        service={editingService}
        providedBy={`Organization/${clinicId}`}
        location={undefined}
      />
    </div>
  );
}
