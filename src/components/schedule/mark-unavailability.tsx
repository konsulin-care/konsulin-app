'use client';

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
import { CalendarUnavailability as Calendar } from '@/components/ui/calendar-unavailability';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth/authContext';
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
};

export default function MarkUnavailabilityButton({ triggerClassName }: Props) {
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

  const roles = (roleEntries || [])
    .map((e: any) => e.resource)
    .filter((r: any) => r?.active);

  return (
    <>
      <Button
        className={triggerClassName || 'bg-[#F9F9F9] font-bold text-[#2C2F35]'}
        variant='ghost'
        onClick={() => setOpen(true)}
      >
        Mark Unavailable Date/Time
      </Button>

      <Dialog
        open={open}
        onOpenChange={o => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className='mx-auto max-h-[85vh] max-w-screen-sm overflow-y-auto p-4'>
          <DialogHeader>
            <div className='mx-auto text-[20px] font-bold'>
              Unavailable Date
            </div>
          </DialogHeader>

          <div className='mt-2 space-y-4'>
            <div className='flex flex-col gap-2'>
              <div className='text-center text-xs font-bold'>Date</div>
              <div className='flex w-full justify-center'>
                <Calendar
                  mode='single'
                  selected={date}
                  onSelect={setDate as any}
                  className='p-0'
                />
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Checkbox
                checked={allDay}
                onCheckedChange={v => setAllDay(!!v)}
              />
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
                    onChange={e => setFromTime(e.target.value)}
                  />
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium'>To</span>
                  <input
                    type='time'
                    className='block rounded-md border-2 p-2 text-sm'
                    value={toTime}
                    onChange={e => setToTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className='flex flex-col gap-2'>
              <div className='text-xs font-bold'>
                Apply to Practitioner Role(s)
              </div>
              {rolesLoading ? (
                <div className='text-muted text-sm'>Loading roles...</div>
              ) : roles?.length ? (
                <div className='grid grid-cols-1 gap-2'>
                  {roles.map((r: any) => (
                    <label key={r.id} className='flex items-center gap-2'>
                      <Checkbox
                        checked={selectedRoleIds.includes(r.id)}
                        onCheckedChange={() => {
                          if (selectedRoleIds.includes(r.id))
                            setSelectedRoleIds(
                              selectedRoleIds.filter(x => x !== r.id)
                            );
                          else setSelectedRoleIds([...selectedRoleIds, r.id]);
                        }}
                      />
                      <span className='text-sm'>
                        {r.organizationData?.name || r.id}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className='text-muted text-sm'>No roles</div>
              )}
            </div>

            <div className='flex flex-col gap-2'>
              <div className='text-xs font-bold'>Reason</div>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder='Practitioner unavailable'
                className='w-full resize-none text-[12px] text-[#2C2F35]'
              />
            </div>

            <div className='flex justify-end gap-3'>
              <Button
                variant='outline'
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
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
        </DialogContent>
      </Dialog>

      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conflicts detected</AlertDialogTitle>
            <AlertDialogDescription>
              {lastConflicts.length
                ? lastConflicts.map((c, i) => (
                    <div key={i} className='mb-2'>
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
