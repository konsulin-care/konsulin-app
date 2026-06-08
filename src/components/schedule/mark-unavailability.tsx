'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, max-lines */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar-temp';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth/authContext';
import { cn } from '@/lib/utils';
import { useMarkUnavailability } from '@/services/api/schedule';
import { useGetPractitionerRolesDetail } from '@/services/clinicians';
import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

function toOffsetISOString(date: Date) {
  const pad = (n: number) => `${Math.floor(Math.abs(n))}`.padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const tz = -date.getTimezoneOffset();
  const sign = tz >= 0 ? '+' : '-';
  const tzh = pad(Math.trunc(tz / 60));
  const tzm = pad(tz % 60);
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}${sign}${tzh}:${tzm}`;
}

type Props = {
  triggerClassName?: string;
  buttonText?: string;
};

/** Trigger button that opens the unavailability dialog. */
function UnavailabilityTrigger({
  triggerClassName,
  buttonText,
  onClick
}: Readonly<{
  triggerClassName?: string;
  buttonText: string;
  onClick: () => void;
}>) {
  return (
    <button
      type='button'
      className={cn(
        'cursor-pointer transition-all duration-200 hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        triggerClassName
      )}
      onClick={onClick}
    >
      <div className='bg-secondary min-w-[100px] rounded-full p-[7px]'>
        <p className='text-[10px] text-white'>{buttonText}</p>
      </div>
    </button>
  );
}

/** Form body inside the unavailability dialog — date, time, roles, reason, buttons. */
function UnavailabilityFormBody({
  date,
  onDateSelect,
  allDay,
  onAllDayChange,
  fromTime,
  onFromTimeChange,
  toTime,
  onToTimeChange,
  roleEntries,
  rolesLoading,
  selectedRoleIds,
  onSelectedRoleIdsChange,
  reason,
  onReasonChange,
  canSave,
  saving,
  onSave,
  onCancel
}: Readonly<{
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  allDay: boolean;
  onAllDayChange: (checked: boolean) => void;
  fromTime: string;
  onFromTimeChange: (value: string) => void;
  toTime: string;
  onToTimeChange: (value: string) => void;
  roleEntries: any[];
  rolesLoading: boolean;
  selectedRoleIds: string[];
  onSelectedRoleIdsChange: (ids: string[]) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}>) {
  const roles = (roleEntries || [])
    .map((e: any) => e.resource)
    .filter((r: any) => r?.active);

  let rolesContent: React.ReactNode;
  if (rolesLoading) {
    rolesContent = <div className='text-muted text-sm'>Loading roles...</div>;
  } else if (roles?.length) {
    rolesContent = (
      <div className='grid grid-cols-1 gap-2'>
        {roles.map((r: any) => (
          <label key={r.id} className='flex items-center gap-2'>
            <Checkbox
              checked={selectedRoleIds.includes(r.id)}
              onCheckedChange={() => {
                if (selectedRoleIds.includes(r.id))
                  onSelectedRoleIdsChange(
                    selectedRoleIds.filter(x => x !== r.id)
                  );
                else onSelectedRoleIdsChange([...selectedRoleIds, r.id]);
              }}
            />
            <span className='text-sm'>{r.organizationData?.name || r.id}</span>
          </label>
        ))}
      </div>
    );
  } else {
    rolesContent = <div className='text-muted text-sm'>No roles</div>;
  }

  return (
    <div className='mt-2 space-y-4'>
      <div className='flex flex-col gap-2'>
        <div className='text-center text-xs font-bold'>Date</div>
        <div className='flex w-full justify-center'>
          <Calendar
            mode='single'
            selected={date}
            onSelect={onDateSelect}
            className='p-0'
          />
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <Checkbox checked={allDay} onCheckedChange={onAllDayChange} />
        <span className='text-sm'>Unavailable all day</span>
      </div>

      {!allDay && (
        <div className='flex w-full items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>From</span>
            <input
              type='time'
              className='block rounded-md border-2 p-2 text-sm'
              value={fromTime}
              onChange={e => onFromTimeChange(e.target.value)}
            />
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>To</span>
            <input
              type='time'
              className='block rounded-md border-2 p-2 text-sm'
              value={toTime}
              onChange={e => onToTimeChange(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className='flex flex-col gap-2'>
        <div className='text-xs font-bold'>Apply to Practitioner Role(s)</div>
        {rolesContent}
      </div>

      <div className='flex flex-col gap-2'>
        <div className='text-xs font-bold'>Reason</div>
        <Textarea
          value={reason}
          onChange={e => onReasonChange(e.target.value)}
          placeholder='Practitioner unavailable'
          className='w-full resize-none text-[12px] text-[#2C2F35]'
        />
      </div>

      <div className='flex justify-end gap-3'>
        <Button variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className='bg-secondary font-bold text-white'
          disabled={!canSave || saving}
          onClick={onSave}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

/** Dialog body for the mark-unavailability form. */
function UnavailabilityDialogBody({
  open,
  onOpenChange,
  date,
  onDateSelect,
  allDay,
  onAllDayChange,
  fromTime,
  onFromTimeChange,
  toTime,
  onToTimeChange,
  roleEntries,
  rolesLoading,
  selectedRoleIds,
  onSelectedRoleIdsChange,
  reason,
  onReasonChange,
  canSave,
  saving,
  onSave,
  onCancel
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  allDay: boolean;
  onAllDayChange: (checked: boolean) => void;
  fromTime: string;
  onFromTimeChange: (value: string) => void;
  toTime: string;
  onToTimeChange: (value: string) => void;
  roleEntries: any[];
  rolesLoading: boolean;
  selectedRoleIds: string[];
  onSelectedRoleIdsChange: (ids: string[]) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='mx-auto max-h-[85vh] max-w-screen-sm overflow-y-auto p-4'>
        <DialogHeader>
          <div className='mx-auto text-[20px] font-bold'>Unavailable Date</div>
        </DialogHeader>

        <UnavailabilityFormBody
          date={date}
          onDateSelect={onDateSelect}
          allDay={allDay}
          onAllDayChange={onAllDayChange}
          fromTime={fromTime}
          onFromTimeChange={onFromTimeChange}
          toTime={toTime}
          onToTimeChange={onToTimeChange}
          roleEntries={roleEntries}
          rolesLoading={rolesLoading}
          selectedRoleIds={selectedRoleIds}
          onSelectedRoleIdsChange={onSelectedRoleIdsChange}
          reason={reason}
          onReasonChange={onReasonChange}
          canSave={canSave}
          saving={saving}
          onSave={onSave}
          onCancel={onCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 *
 */
export default function MarkUnavailabilityButton({
  triggerClassName,
  buttonText = 'Mark Unavailable Date/Time'
}: Props) {
  const { state: authState } = useAuth();
  const [open, setOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [allDay, setAllDay] = useState(true);
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [reason, setReason] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const {
    isLoading: rolesLoading,
    refetch,
    data: roleEntries
  } = useGetPractitionerRolesDetail(authState.userInfo.fhirId, {
    onSuccess: entries => {
      const resources = entries?.map(e => e.resource) || [];
      const active = resources
        .filter((r: any) => r.active)
        .map((r: any) => r.id);
      setSelectedRoleIds(active);
    }
  });

  const { mutateAsync: markUnavailable, isLoading: saving } =
    useMarkUnavailability();
  const [lastConflicts, setLastConflicts] = useState<
    { practitionerRoleId: string; slotId: string; start: string; end: string }[]
  >([]);

  const canSave = useMemo(() => {
    if (!date) return false;
    if (!selectedRoleIds.length) return false;
    if (allDay) return true;
    if (!fromTime || !toTime) return false;
    return fromTime < toTime;
  }, [date, allDay, fromTime, toTime, selectedRoleIds]);

  const reset = () => {
    setDate(undefined);
    setAllDay(true);
    setFromTime('');
    setToTime('');
    setReason('');
    setLastConflicts([]);
  };

  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  const onSave = async () => {
    if (!date) return;

    const base = {
      practitionerRoleIds: selectedRoleIds,
      reason: reason?.trim() || 'Practitioner unavailable',
      setStatus: 'busy-tentative' as const
    };

    let payload: any;
    if (allDay) {
      payload = { ...base, allDay: true, date: format(date, 'yyyy-MM-dd') };
    } else {
      const [fh, fm] = fromTime.split(':').map(Number);
      const [th, tm] = toTime.split(':').map(Number);
      const start = new Date(date);
      start.setHours(fh, fm, 0, 0);
      const end = new Date(date);
      end.setHours(th, tm, 0, 0);
      payload = {
        ...base,
        from: toOffsetISOString(start),
        to: toOffsetISOString(end)
      };
    }

    const { data, status } = await markUnavailable(payload);

    if (status === 409 && data?.data?.conflicts?.length) {
      setLastConflicts(
        data.data.conflicts.map(c => ({
          practitionerRoleId: c.practitionerRoleId,
          slotId: c.slotId,
          start: c.start,
          end: c.end
        }))
      );
      setConflictOpen(true);
      return;
    }

    if (status === 200 || status === 201) {
      toast.success('Unavailability saved');
      setOpen(false);
      reset();
      return;
    }

    toast.error(data?.message || 'Failed to save unavailability');
  };

  return (
    <>
      <UnavailabilityTrigger
        triggerClassName={triggerClassName}
        buttonText={buttonText}
        onClick={() => setOpen(true)}
      />

      <UnavailabilityDialogBody
        open={open}
        onOpenChange={o => {
          setOpen(o);
          if (!o) reset();
        }}
        date={date}
        onDateSelect={setDate as any}
        allDay={allDay}
        onAllDayChange={v => setAllDay(Boolean(v))}
        fromTime={fromTime}
        onFromTimeChange={setFromTime}
        toTime={toTime}
        onToTimeChange={setToTime}
        roleEntries={roleEntries}
        rolesLoading={rolesLoading}
        selectedRoleIds={selectedRoleIds}
        onSelectedRoleIdsChange={setSelectedRoleIds}
        reason={reason}
        onReasonChange={setReason}
        canSave={canSave}
        saving={saving}
        onSave={onSave}
        onCancel={() => {
          setOpen(false);
          reset();
        }}
      />

      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conflicts detected</AlertDialogTitle>
            <AlertDialogDescription>
              {lastConflicts.length
                ? lastConflicts.map(c => (
                    <div key={c.slotId} className='mb-2'>
                      Role: {c.practitionerRoleId}
                      <br />
                      Slot: {c.slotId}
                      <br />
                      {c.start} - {c.end}
                    </div>
                  ))
                : 'Conflicts with existing booked slots.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='flex justify-end gap-2'>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => setConflictOpen(false)}>
              OK
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
