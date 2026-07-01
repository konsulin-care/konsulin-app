'use client';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  getServiceDuration,
  setServiceDuration
} from '@/utils/fhir/service-duration';
import type { HealthcareService } from 'fhir/r4';
import { useCallback, useState } from 'react';

const FEE_EXTENSION_URL = 'https://konsulin.id/fhir/StructureDefinition/fee';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSave: (service: HealthcareService) => void;
  readonly service?: HealthcareService;
  readonly providedBy: string;
  readonly location?: string;
};

/** Form fields for name, fee, duration, extra details. */
function FormFields({
  name,
  onNameChange,
  fee,
  onFeeChange,
  duration,
  onDurationChange,
  extraDetails,
  onExtraDetailsChange,
  active,
  onActiveChange
}: {
  readonly name: string;
  readonly onNameChange: (v: string) => void;
  readonly fee: string;
  readonly onFeeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly duration: string;
  readonly onDurationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly extraDetails: string;
  readonly onExtraDetailsChange: (v: string) => void;
  readonly active: boolean;
  readonly onActiveChange: (v: boolean) => void;
}) {
  return (
    <div className='space-y-4 px-4'>
      <div className='flex items-center justify-between'>
        <Switch
          id='service-active'
          checked={active}
          onCheckedChange={onActiveChange}
        />
      </div>

      <div>
        <label htmlFor='service-name' className='text-sm font-medium'>
          Name
        </label>
        <Input
          id='service-name'
          value={name}
          onChange={e => {
            onNameChange(e.target.value);
          }}
          placeholder='General Consultation'
          className='bg-white'
        />
      </div>

      <div>
        <label htmlFor='service-fee' className='text-sm font-medium'>
          Fee
        </label>
        <Input
          id='service-fee'
          value={fee ? Number(fee).toLocaleString('en-US') : ''}
          onChange={onFeeChange}
          placeholder='250,000'
          inputMode='numeric'
          className='bg-white'
        />
      </div>

      <div>
        <label htmlFor='service-duration' className='text-sm font-medium'>
          Duration (minutes)
        </label>
        <Input
          id='service-duration'
          value={duration}
          onChange={onDurationChange}
          placeholder='30'
          inputMode='numeric'
          className='bg-white'
        />
      </div>

      <div>
        <label htmlFor='service-extra-details' className='text-sm font-medium'>
          Extra Details
        </label>
        <Textarea
          id='service-extra-details'
          value={extraDetails}
          onChange={e => {
            onExtraDetailsChange(e.target.value);
          }}
          rows={3}
          className='bg-white'
        />
      </div>
    </div>
  );
}

/**
 * Build a HealthcareService resource from form state.
 */
function buildService(params: {
  id?: string;
  active: boolean;
  name: string;
  fee: number;
  duration: number;
  extraDetails?: string;
  providedBy: string;
  location?: string;
}): HealthcareService {
  const feeExtension = params.fee
    ? [
        {
          url: FEE_EXTENSION_URL,
          valueMoney: { value: params.fee, currency: 'IDR' as const }
        }
      ]
    : undefined;

  let resource: HealthcareService = {
    resourceType: 'HealthcareService',
    ...(params.id ? { id: params.id } : {}),
    ...(feeExtension ? { extension: feeExtension } : {}),
    active: params.active,
    name: params.name,
    extraDetails: params.extraDetails || undefined,
    providedBy: { reference: params.providedBy },
    ...(params.location ? { location: [{ reference: params.location }] } : {})
  };

  if (params.duration > 0) {
    resource = setServiceDuration(resource, params.duration);
  }

  return resource;
}

/** Extract initial fee string from a HealthcareService. */
function initFee(service?: HealthcareService): string {
  const ext = service?.extension?.find(e => e.url === FEE_EXTENSION_URL);
  const val = ext?.valueMoney?.value;
  return val ? val.toString() : '';
}

/** Extract initial duration string from a HealthcareService. */
function initDuration(service?: HealthcareService): string {
  if (!service) return '';
  const val = getServiceDuration(service);
  return val ? val.toString() : '';
}

/**
 * Drawer form for creating or editing a HealthcareService resource.
 *
 * Mode is "edit" when `service` is provided, otherwise "create".
 */
/** Default string from a service field with fallback. */
function initStr(val: string | null | undefined): string {
  return val ?? '';
}

/** Default boolean from a service field with fallback. */
function initBool(val: boolean | null | undefined): boolean {
  return val ?? true;
}

/**
 * Drawer form for creating or editing a HealthcareService resource.
 *
 * Mode is "edit" when `service` is provided, otherwise "create".
 */
export default function ServiceFormDrawer({
  open,
  onClose,
  onSave,
  service,
  providedBy,
  location
}: Props) {
  const [name, setName] = useState(initStr(service?.name));
  const [extraDetails, setExtraDetails] = useState(
    initStr(service?.extraDetails)
  );
  const [active, setActive] = useState(initBool(service?.active));
  const [fee, setFee] = useState(initFee(service));
  const [duration, setDuration] = useState(initDuration(service));

  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDuration(e.target.value.replace(/\D/g, ''));
    },
    []
  );

  const handleFeeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFee(e.target.value.replace(/\D/g, ''));
    },
    []
  );

  const handleSave = useCallback(() => {
    const resource = buildService({
      id: service?.id,
      active,
      name,
      fee: Number(fee),
      duration: Number(duration),
      extraDetails,
      providedBy,
      location
    });
    onSave(resource);
  }, [
    active,
    duration,
    extraDetails,
    fee,
    location,
    name,
    onSave,
    providedBy,
    service?.id
  ]);

  return (
    <Drawer
      open={open}
      onOpenChange={o => {
        if (!o) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{service ? 'Edit Service' : 'Add Service'}</DrawerTitle>
          <DrawerDescription>
            Configure a healthcare service for this practitioner.
          </DrawerDescription>
        </DrawerHeader>

        <FormFields
          name={name}
          onNameChange={setName}
          fee={fee}
          onFeeChange={handleFeeChange}
          duration={duration}
          onDurationChange={handleDurationChange}
          extraDetails={extraDetails}
          onExtraDetailsChange={setExtraDetails}
          active={active}
          onActiveChange={setActive}
        />

        <DrawerFooter>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            variant='secondary'
            className='text-white'
          >
            Save
          </Button>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
