'use client';

import FeeInput from '@/components/shared/fee-input';
import AppDrawer from '@/components/ui/app-drawer';
import { Input } from '@/components/ui/input';
import { SwitchField } from '@/components/ui/switch-field';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/i18n';
import { getFee, setFee } from '@/utils/fhir/fee';
import {
  getServiceDuration,
  setServiceDuration
} from '@/utils/fhir/service-duration';
import type { HealthcareService } from 'fhir/r4';
import { useCallback, useState } from 'react';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSave: (service: HealthcareService) => void;
  readonly service?: HealthcareService | null;
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
  readonly onFeeChange: (raw: string) => void;
  readonly duration: string;
  readonly onDurationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly extraDetails: string;
  readonly onExtraDetailsChange: (v: string) => void;
  readonly active: boolean;
  readonly onActiveChange: (v: boolean) => void;
}) {
  const t = useTranslations('common');
  return (
    <div className='space-y-4'>
      <SwitchField
        checked={active}
        onCheckedChange={onActiveChange}
        label={t('practitioner.service_active')}
        offLabel={t('practitioner.service_inactive')}
      />

      <div>
        <label htmlFor='service-name' className='text-sm font-medium'>
          {t('practitioner.service_name')}
        </label>
        <Input
          id='service-name'
          value={name}
          onChange={e => {
            onNameChange(e.target.value);
          }}
          placeholder={t('practitioner.service_name_placeholder')}
          className='bg-white'
        />
      </div>

      <div>
        <label htmlFor='service-fee' className='text-sm font-medium'>
          {t('practitioner.service_fee')}
        </label>
        <FeeInput
          id='service-fee'
          value={fee}
          onChange={onFeeChange}
          placeholder='250,000'
          className='bg-white'
        />
      </div>

      <div>
        <label htmlFor='service-duration' className='text-sm font-medium'>
          {t('practitioner.service_duration')}
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
          {t('practitioner.service_extra_details')}
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
  let resource: HealthcareService = {
    resourceType: 'HealthcareService',
    ...(params.id ? { id: params.id } : {}),
    active: params.active,
    name: params.name,
    extraDetails: params.extraDetails || undefined,
    providedBy: { reference: params.providedBy },
    ...(params.location ? { location: [{ reference: params.location }] } : {})
  };

  if (params.fee > 0) {
    resource = setFee(resource, params.fee);
  }

  if (params.duration > 0) {
    resource = setServiceDuration(resource, params.duration);
  }

  return resource;
}

/** Extract initial fee string from a HealthcareService. */
function initFee(service?: HealthcareService): string {
  if (!service) return '';
  const fee = getFee(service);
  return fee?.value ? fee.value.toString() : '';
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
  const t = useTranslations('common');
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
    <AppDrawer
      open={open}
      onClose={onClose}
      title={
        service ? t('practitioner.edit_service') : t('practitioner.add_service')
      }
      description={t('practitioner.service_description')}
      ctaLabel={t('practitioner.save')}
      onCtaClick={handleSave}
      ctaDisabled={!name.trim()}
    >
      <FormFields
        name={name}
        onNameChange={setName}
        fee={fee}
        onFeeChange={setFee}
        duration={duration}
        onDurationChange={handleDurationChange}
        extraDetails={extraDetails}
        onExtraDetailsChange={setExtraDetails}
        active={active}
        onActiveChange={setActive}
      />
    </AppDrawer>
  );
}
