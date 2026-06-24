'use client';

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, sonarjs/cognitive-complexity, max-lines, max-depth, react-hooks/exhaustive-deps, react/jsx-max-depth */
import EmptyState from '@/components/general/empty-state';
import Input from '@/components/general/input';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { updateSchedule } from '@/services/api/schedule';
import {
  useCreateInvoice,
  useGetPractitionerRolesDetail,
  useUpdateInvoice,
  useUpdatePractitionerInfo
} from '@/services/clinicians';
import { IPractitionerRoleDetail } from '@/types/practitioner';
import { mapAddress } from '@/utils/helper';
import { Address, BundleEntry, CodeableConcept, Schedule } from 'fhir/r4';
import { ChevronDown, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import FirmFilter, { IFirmFilter } from './firm-filter';

type SlotConfig = { slotMinutes?: number; bufferMinutes?: number };

/** Parse slot/buffer minutes from a Schedule.comment JSON string. */
function parseScheduleComment(comment: unknown): SlotConfig {
  try {
    if (typeof comment !== 'string' || !comment.trim()) return {};
    const parsed = JSON.parse(comment);
    const sm = Number(parsed?.slotMinutes);
    const bm = Number(parsed?.bufferMinutes);
    const out: SlotConfig = {};
    if (Number.isFinite(sm) && sm > 0) out.slotMinutes = sm;
    if (Number.isFinite(bm) && bm >= 0) out.bufferMinutes = bm;
    return out;
  } catch {
    return {};
  }
}

/** Build a JSON comment string from session duration and buffer time. */
function buildScheduleComment(
  sessionDuration: string | undefined,
  bufferTime: string | undefined
): string | undefined {
  const sdNum = Number(sessionDuration);
  const btNum = Number(bufferTime);

  const sdValid = Number.isFinite(sdNum) && sdNum > 0;
  const btValid = Number.isFinite(btNum) && btNum >= 0;

  if (!sdValid && !btValid) return undefined;

  const slotMinutes = sdValid ? sdNum : 0;
  const bufferMinutes = btValid ? btNum : 0;
  return JSON.stringify({ slotMinutes, bufferMinutes });
}

/**
 * Produce the browser's timezone offset as a GMT string.
 *
 * @returns A string in `GMT±H` or `GMT±H:MM` format representing the local timezone offset (examples: `GMT+7`, `GMT-05:30`, `GMT+0`).
 */
function getBrowserTimezoneGMT(): string {
  const offset = -new Date().getTimezoneOffset(); // Note: negative because getTimezoneOffset returns opposite
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';

  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }
  return `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

// Extract timezone from Period (similar to practitioner-availability.tsx)
/**
 * Extracts a GMT offset string from the `start` or `end` ISO 8601 datetime in a period object.
 *
 * Accepts common ISO timezone formats (e.g., `+07:00`, `+07`, `-05:30`, `-0500`, `Z`) and prefers `start` when both `start` and `end` are present.
 *
 * @param period - Object containing optional ISO 8601 `start` or `end` datetime strings
 * @returns A GMT offset string such as `GMT+7`, `GMT+07:00`, `GMT-05:30`, or `GMT+0` for UTC; `null` if no timezone can be determined
 */
// eslint-disable-next-line complexity
function extractTimezoneFromPeriod(period?: {
  start?: string;
  end?: string;
}): string | null {
  const iso = period?.start || period?.end;

  if (typeof iso !== 'string' || !iso.trim()) {
    return null;
  }

  // Try multiple patterns to handle different ISO 8601 formats
  // Pattern 1: Full format with colon: +07:00, -05:30
  let match = iso.match(/([+-])(\d{2}):(\d{2})(?:\d{3})?$/); // eslint-disable-line security/detect-unsafe-regex
  if (match) {
    const sign = match[1];
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);

    if (minutes === 0) {
      return `GMT${sign}${hours}`;
    }
    return `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
  }

  // Pattern 2: Format without colon: +07, -05
  match = iso.match(/([+-])(\d{2})(?:\d{2})?$/); // eslint-disable-line security/detect-unsafe-regex
  if (match) {
    const sign = match[1];
    const hours = parseInt(match[2], 10);

    return `GMT${sign}${hours}`;
  }

  // Pattern 3: UTC (Z)
  if (iso.endsWith('Z') || iso.match(/Z$/)) {
    return 'GMT+0';
  }

  // Pattern 4: Try to extract from end of string more flexibly
  // Look for timezone pattern at the end: +HH:MM, +HHMM, -HH:MM, -HHMM, Z
  const tzPatterns = [
    /([+-])(\d{2}):(\d{2})$/,
    /([+-])(\d{4})$/,
    /([+-])(\d{2})$/,
    /Z$/
  ];

  for (const pattern of tzPatterns) {
    match = iso.match(pattern);
    if (match) {
      if (match[0] === 'Z') {
        return 'GMT+0';
      }

      const sign = match[1];
      if (match[3]) {
        // Has minutes (format with colon)
        const hours = parseInt(match[2], 10);
        const minutes = parseInt(match[3], 10);
        if (minutes === 0) {
          return `GMT${sign}${hours}`;
        }
        return `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
      } else if (match[2]) {
        // No minutes, just hours
        const hoursStr = match[2];
        if (hoursStr.length === 4) {
          // Format: +0700 (4 digits)
          const hours = parseInt(hoursStr.slice(0, 2), 10);
          const minutes = parseInt(hoursStr.slice(2, 4), 10);
          if (minutes === 0) {
            return `GMT${sign}${hours}`;
          }
          return `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
        } else {
          // Format: +07 (2 digits)
          const hours = parseInt(hoursStr, 10);
          return `GMT${sign}${hours}`;
        }
      }
    }
  }

  return null;
}

// getTheLatestEntry is a helper function to get the latest entry from an array of objects,
// for now, the use case of this function is to consistenly use the same Schedule
// object in case a practitioner role has multiple schedules.
function getTheLatestEntry<T extends { meta?: { lastUpdated?: string } }>(
  arr: T[] | undefined
): T | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const withDates = arr
    .map(item => ({
      item,
      ts: item?.meta?.lastUpdated ? Date.parse(item.meta.lastUpdated) : NaN
    }))
    .toSorted((a, b) => (isNaN(b.ts) ? -1 : b.ts) - (isNaN(a.ts) ? -1 : a.ts));
  const first = withDates[0];
  if (first && !isNaN(first.ts)) return first.item;
  return arr[0];
}

/** Input field for a firm's fee. */
const FeeInput = ({
  id,
  value,
  onChange
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  return (
    <div className='flex w-full items-center justify-between'>
      <label htmlFor={id} className='text-sm font-medium text-gray-700'>
        Fee
      </label>
      <input
        id={id}
        type='text'
        className='w-3/4 rounded-lg border px-3 py-2 text-gray-900'
        value={value}
        onChange={onChange}
        placeholder='Rp 250.000'
      />
    </div>
  );
};

/** Tag-based specialty input with add/remove functionality. */
const SpecialtiesSection = ({
  id,
  specialties,
  tagInput,
  onTagChange,
  onTagAdd,
  onTagRemove
}: {
  id: string;
  specialties: CodeableConcept[];
  tagInput: string;
  onTagChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTagAdd: (event: React.KeyboardEvent) => void;
  onTagRemove: (tagIndex: number) => void;
}) => {
  return (
    <div className='mt-2 flex w-full items-center'>
      <div className='w-1/4'>
        <label htmlFor={id} className='text-sm font-medium text-gray-700'>
          Specialties
        </label>
      </div>
      <div className='relative w-3/4 rounded-lg border bg-white px-3 py-2 text-gray-900'>
        <div className='mb-2 flex flex-wrap gap-2'>
          {specialties &&
            Array.isArray(specialties) &&
            specialties.map((tag: CodeableConcept, tagIndex: number) => (
              <div
                key={`${tag.text ?? tagIndex}`}
                className='text-md flex items-center space-x-1 rounded-full bg-[#F9F9F9] px-2 py-1 text-gray-700'
              >
                <span>{tag.text}</span>
                <button
                  type='button'
                  onClick={() => onTagRemove(tagIndex)}
                  className='focus:outline-none'
                  aria-label='Remove tag'
                >
                  <XCircle color='#FF6B6B' size={16} />
                </button>
              </div>
            ))}
        </div>
        <textarea
          id={id}
          value={tagInput}
          onChange={onTagChange}
          onKeyDown={onTagAdd}
          className='w-full rounded-lg border p-2 text-sm text-gray-900'
          placeholder='Add a new specialty and press Enter'
        />
      </div>
    </div>
  );
};

/** Active firm banner showing loading skeleton or current firm name. */
const ActiveFirmSection = ({
  isLoading,
  isFetching,
  activeFirms
}: {
  isLoading: boolean;
  isFetching: boolean;
  activeFirms: any[];
}) => {
  if (isLoading || isFetching) {
    return (
      <Skeleton
        count={1}
        className='h-[50px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
      />
    );
  }
  return (
    <div className='rounded-lg bg-[#F9F9F9] p-4'>
      <div className='flex justify-between'>
        <div className='text-sm opacity-40'>Current Firm</div>
        <div className='text-m font-bold'>
          {activeFirms[0]?.organizationData.name || 'No active firms'}
        </div>
      </div>
    </div>
  );
};

/** Toggle button content for the collapsible firm card. */
const CollapsibleToggle = ({
  isOpen,
  onToggle,
  data
}: {
  isOpen: boolean;
  onToggle: () => void;
  data: { organizationData: { name?: string; address?: Address[] } };
}) => (
  <button
    className={`toggle flex w-full items-center justify-between rounded-[25px] p-2 text-left focus:outline-none ${
      isOpen
        ? 'bg-secondary text-[18px] font-bold text-white'
        : 'bg-transparent text-gray-700'
    }`}
    onClick={onToggle}
    aria-expanded={isOpen}
    aria-controls='collapsible-content'
  >
    <div className='flex items-center'>
      <Image
        className='block rounded-full'
        src='/images/clinic.jpg'
        alt='Prefix Icon'
        width={38}
        height={38}
        style={{ width: '38px', height: '38px' }}
      />
      <div className='flex flex-col justify-center gap-1 pl-2'>
        <span className='text-sm'>{data.organizationData.name}</span>
        <span className='text-xs'>
          {mapAddress(data.organizationData.address ?? [])}
        </span>
      </div>
    </div>
    <div className='flex items-center gap-2'>
      {isOpen && (
        <span className='text-xs font-medium text-white/80'>Active</span>
      )}
      <div
        className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      >
        <ChevronDown size={20} color={isOpen ? 'white' : 'currentColor'} />
      </div>
    </div>
  </button>
);

/** Expandable firm card with header and collapsible content. */
const Collapsible = ({
  isOpen,
  onToggle,
  children,
  data
}: {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  data: { organizationData: { name?: string; address?: Address[] } };
}) => (
  <div className='collapsible my-4 rounded-[25px] border bg-gray-50'>
    <CollapsibleToggle isOpen={isOpen} onToggle={onToggle} data={data} />
    {isOpen && (
      <div
        id='collapsible-content'
        className='content rounded-b-[25px] bg-gray-50 p-4'
      >
        {children}
      </div>
    )}
  </div>
);

/** Collapsible firm item with fee, specialties, session, and timezone inputs. */
const CollapsibleItem = ({
  index,
  firm,
  invoice,
  isOpen,
  onToggle,
  tagInputs,
  handleChangeFee,
  handleAddTag,
  handleRemoveTag,
  setTagInputs,
  slotConfigs,
  setSlotConfigs
}: {
  index: number;
  firm: IPractitionerRoleDetail;
  invoice: any;
  isOpen: boolean;
  onToggle: (index: number) => void;
  tagInputs: string[];
  handleChangeFee: (index: number, value: string) => void;
  handleAddTag: (index: number, e: React.KeyboardEvent) => void;
  handleRemoveTag: (index: number, tagIndex: number) => void;
  setTagInputs: React.Dispatch<React.SetStateAction<string[]>>;
  slotConfigs: Record<
    number,
    { sessionDuration?: string; bufferTime?: string; timezone?: string }
  >;
  setSlotConfigs: React.Dispatch<
    React.SetStateAction<
      Record<
        number,
        { sessionDuration?: string; bufferTime?: string; timezone?: string }
      >
    >
  >;
}) => {
  return (
    <Collapsible
      key={index}
      isOpen={isOpen}
      onToggle={() => onToggle(index)}
      data={firm}
    >
      <div className='flex flex-col space-y-2'>
        <FeeInput
          id={`fee-${index}`}
          value={invoice.totalNet.value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const numberOnly = /^\d*$/;
            if (numberOnly.test(e.target.value)) {
              handleChangeFee(index, e.target.value);
            }
          }}
        />
        <SpecialtiesSection
          id={`specialty-${index}`}
          specialties={firm?.specialty ?? []}
          tagInput={tagInputs[index] || ''}
          onTagChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setTagInputs((prevTags: string[]) => {
              const updatedTags = [...prevTags];
              updatedTags[index] = e.target.value;
              return updatedTags;
            })
          }
          onTagAdd={(event: React.KeyboardEvent) => handleAddTag(index, event)}
          onTagRemove={(tagIndex: number) => handleRemoveTag(index, tagIndex)}
        />
        <div className='flex w-full items-center justify-between'>
          <label
            htmlFor={`session-duration-${index}`}
            className='text-sm font-medium text-gray-700'
          >
            Session Duration
          </label>
          <input
            id={`session-duration-${index}`}
            type='text'
            className='w-3/4 rounded-lg border px-3 py-2 text-gray-900'
            placeholder='duration in minutes'
            value={slotConfigs[index]?.sessionDuration ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (value === '') {
                setSlotConfigs((s: any) => ({
                  ...s,
                  [index]: { ...s[index], sessionDuration: '' }
                }));
                return;
              }
              const numberOnly = /^\d+$/;
              if (numberOnly.test(value) && Number(value) > 0) {
                setSlotConfigs((s: any) => ({
                  ...s,
                  [index]: { ...s[index], sessionDuration: value }
                }));
              }
            }}
          />
        </div>
        <div className='flex w-full items-center justify-between'>
          <label
            htmlFor={`buffer-time-${index}`}
            className='text-sm font-medium text-gray-700'
          >
            Buffer Time
          </label>
          <input
            id={`buffer-time-${index}`}
            type='text'
            className='w-3/4 rounded-lg border px-3 py-2 text-gray-900'
            placeholder='gap between sessions (minutes)'
            value={slotConfigs[index]?.bufferTime ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (value === '') {
                setSlotConfigs((s: any) => ({
                  ...s,
                  [index]: { ...s[index], bufferTime: '' }
                }));
                return;
              }
              const numberOnly = /^\d+$/;
              if (numberOnly.test(value)) {
                setSlotConfigs((s: any) => ({
                  ...s,
                  [index]: { ...s[index], bufferTime: value }
                }));
              }
            }}
          />
        </div>
        <div className='flex w-full items-center justify-between'>
          <label
            htmlFor={`timezone-${index}`}
            className='text-sm font-medium text-gray-700'
          >
            Time Zone
          </label>
          <input
            id={`timezone-${index}`}
            type='text'
            className='w-3/4 cursor-not-allowed rounded-lg border bg-gray-100 px-3 py-2 text-gray-900'
            placeholder='GMT+7'
            value={slotConfigs[index]?.timezone || getBrowserTimezoneGMT()}
            readOnly
            disabled
          />
        </div>
      </div>
    </Collapsible>
  );
};

/** Practice settings page: manage firms, specialties, fees, schedules. */
const EditPractice = () => {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [firmFilter, setFirmFilter] = useState<{
    city: string | null;
    province_code?: string;
  }>({ city: null });
  const [tagInputs, setTagInputs] = useState<string[]>([]);
  const [firmData, setFirmData] = useState<IPractitionerRoleDetail[]>([]);
  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const { state: authState } = useAuth();
  const [openCollapsibles, setOpenCollapsibles] = useState<
    Record<number, boolean>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [slotConfigs, setSlotConfigs] = useState<
    Record<
      number,
      { sessionDuration?: string; bufferTime?: string; timezone?: string }
    >
  >({});

  const {
    isLoading: isPractitionerRolesLoading,
    isFetching: isPractitionerRolesFetching
  } = useGetPractitionerRolesDetail(authState.userInfo.fhirId, data => {
    const resources = (data?.map(entry => entry.resource) || []).filter(
      Boolean
    );

    /* separate invoice data from the main data
     * because they use different endpoints */
    const invoiceDataList: any[] = [];
    const firmDataList: any[] = [];

    resources.forEach(resource => {
      const { invoiceData, id, ...rest } = resource;

      const initialInvoice = {
        resourceType: 'Invoice',
        status: 'draft',
        totalNet: {
          value: 0,
          currency: 'IDR'
        },
        participant: [
          {
            actor: {
              reference: `PractitionerRole/${id}`
            }
          }
        ]
      };

      invoiceDataList.push(invoiceData || initialInvoice);
      firmDataList.push({ id, ...rest });
    });

    setInvoiceData(invoiceDataList);
    setFirmData(firmDataList);
  });

  const { mutateAsync: updatePractitionerInfo } = useUpdatePractitionerInfo();
  const { mutateAsync: createInvoice } = useCreateInvoice();
  const { mutateAsync: updateInvoice } = useUpdateInvoice();

  useEffect(() => {
    setSlotConfigs(prev => {
      const next = { ...prev } as Record<
        number,
        { sessionDuration?: string; bufferTime?: string; timezone?: string }
      >;
      firmData.forEach((firm: any, idx: number) => {
        const firstSchedule = getTheLatestEntry<Schedule>(
          firm?.scheduleData as Schedule[]
        );
        const { slotMinutes, bufferMinutes } = parseScheduleComment(
          firstSchedule?.comment
        );

        const extractedTz = extractTimezoneFromPeriod(firm?.period);
        const timezone = extractedTz || getBrowserTimezoneGMT();

        if (slotMinutes != null || bufferMinutes != null || timezone) {
          next[idx] = {
            sessionDuration: slotMinutes == null ? '' : String(slotMinutes),
            bufferTime: bufferMinutes == null ? '' : String(bufferMinutes),
            timezone
          };
        }
      });
      return next;
    });
  }, [firmData]);

  // Initialize collapsible state based on active field
  useEffect(() => {
    setOpenCollapsibles(prev => {
      const next = { ...prev };
      firmData.forEach((firm: any, idx: number) => {
        if (firm.active) {
          next[idx] = true;
        } else if (next[idx] === undefined) {
          next[idx] = false;
        }
      });
      return next;
    });
  }, [firmData]);

  // Ensure timezone is always current browser timezone
  useEffect(() => {
    setSlotConfigs(prev => {
      const next = { ...prev };
      const browserTz = getBrowserTimezoneGMT();
      Object.keys(next).forEach(key => {
        const idx = parseInt(key, 10);
        if (firmData[idx]) {
          next[idx] = {
            ...next[idx],
            timezone: browserTz
          };
        }
      });
      return next;
    });
  }, []); // Run once on mount to set initial browser timezone

  const filteredFirmData = useMemo(() => {
    if (!firmData || firmData.length === 0) return [];

    const { city } = firmFilter;
    const lowerKeyword = searchInput.trim().toLowerCase();

    if (!lowerKeyword && !city) return firmData;

    return firmData.filter((data: IPractitionerRoleDetail) => {
      const organizationName = data.organizationData?.name?.toLowerCase() || '';
      const organizationCity = data.organizationData?.address?.[0]?.city || '';

      const nameMatches =
        !lowerKeyword || organizationName.includes(lowerKeyword);
      const cityMatches = !city || city === organizationCity;

      return nameMatches && cityMatches;
    });
  }, [firmData, firmFilter, searchInput]);

  /** Save all firm data, invoices, and schedule changes to the server. */
  const handleSubmitFirmsStatus = async () => {
    setIsSaving(true);
    const updatedInvoice = [...invoiceData];
    const updatedFirm = [...firmData];
    let hasErrors = false;
    const errorMessages: string[] = [];

    try {
      // Update all practitioner info (including active field and specialties)
      const cleanedFirmsData = firmData.map(firm => {
        const { scheduleData, organizationData, ...rest } = firm;
        return rest;
      });

      const practitionerUpdateResults = await Promise.allSettled(
        cleanedFirmsData.map(firm => updatePractitionerInfo(firm))
      );

      practitionerUpdateResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          updatedFirm[index] = {
            scheduleData: firmData[index].scheduleData,
            organizationData: firmData[index].organizationData,
            ...result.value
          };
        } else if (result.status === 'rejected') {
          hasErrors = true;
          errorMessages.push(
            `Failed to update practitioner info for firm ${index + 1}`
          );
          console.error(
            `Practitioner update error for firm ${index + 1}:`,
            result.reason
          );
        }
      });

      // Update all invoice data (fee)
      const invoiceUpdateResults = await Promise.allSettled(
        invoiceData.map((invoice, index) => {
          const invoicePayload = { ...invoice };
          if (invoicePayload.status === 'draft' && !invoicePayload.id) {
            invoicePayload.status = 'final';
            return createInvoice(invoicePayload);
          } else {
            return updateInvoice(invoicePayload);
          }
        })
      );

      invoiceUpdateResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          updatedInvoice[index] = result.value;
        } else if (result.status === 'rejected') {
          hasErrors = true;
          errorMessages.push(`Failed to update invoice for firm ${index + 1}`);
          console.error(
            `Invoice update error for firm ${index + 1}:`,
            result.reason
          );
        }
      });

      // Update all schedule data (session duration and buffer time)
      const scheduleUpdateResults = await Promise.allSettled(
        firmData.map(async (firm, index) => {
          const latestSchedule = getTheLatestEntry<Schedule>(
            firm.scheduleData as unknown as Schedule[]
          );
          if (!latestSchedule) {
            return { skipped: true, index };
          }

          const sessionDuration = slotConfigs[index]?.sessionDuration;
          const bufferTime = slotConfigs[index]?.bufferTime;
          const newComment = buildScheduleComment(sessionDuration, bufferTime);

          if (newComment === undefined) {
            return { skipped: true, index };
          }

          const updated = await updateSchedule({
            ...latestSchedule,
            resourceType: 'Schedule',
            comment: newComment
          } as Schedule);

          return { updated, index };
        })
      );

      scheduleUpdateResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          if (result.value.skipped) {
            // Schedule update was skipped (no schedule found or no changes)
            return;
          }
          if (result.value.updated) {
            const sArr = Array.isArray(updatedFirm[index].scheduleData)
              ? [...updatedFirm[index].scheduleData]
              : [];
            const replaceIdx = sArr.findIndex(
              (s: any) => s?.id === result.value.updated?.id
            );
            if (replaceIdx === -1) {
              sArr.unshift(result.value.updated);
            } else {
              sArr[replaceIdx] = result.value.updated;
            }
            updatedFirm[index] = {
              ...updatedFirm[index],
              scheduleData: sArr as unknown as Schedule
            };
          }
        } else if (result.status === 'rejected') {
          hasErrors = true;
          errorMessages.push(`Failed to update schedule for firm ${index + 1}`);
          console.error(
            `Schedule update error for firm ${index + 1}:`,
            result.reason
          );
        }
      });

      // Update state with all successful changes
      setInvoiceData(updatedInvoice);
      setFirmData(updatedFirm);

      if (hasErrors) {
        toast.error('Some changes failed to save. Please try again.');
        if (errorMessages.length > 0) {
          console.error('Save errors:', errorMessages);
        }
      } else {
        toast.success('All changes saved successfully');
        setIsDrawerOpen(true);
      }
    } catch (error) {
      toast.error('Failed to save changes. Please try again.');
      console.error('Unexpected error during save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = useCallback((index: number) => {
    setOpenCollapsibles(prevState => {
      const newState = !prevState[index];

      // Update the active field based on the new toggle state
      setFirmData(prevData => {
        const updatedData = [...prevData];
        updatedData[index] = {
          ...updatedData[index],
          active: newState
        };
        return updatedData;
      });

      return {
        ...prevState,
        [index]: newState
      };
    });
  }, []);

  const handleAddTag = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      const inputValue = tagInputs[index]?.trim();

      if (e.key === 'Enter' && inputValue !== '') {
        e.preventDefault(); // prevent "Enter" to create a new line

        setFirmData(prevData => {
          const updatedData = [...prevData];
          const currentSpecialties = updatedData[index].specialty || [];
          const alreadyExists = currentSpecialties.some(
            (specialty: CodeableConcept) =>
              (specialty.text ?? '').toLowerCase() === inputValue.toLowerCase()
          );

          if (!alreadyExists) {
            updatedData[index] = {
              ...updatedData[index],
              specialty: [...currentSpecialties, { text: inputValue }]
            };
          }

          return updatedData;
        });

        // clearing input after tag is added
        setTagInputs(prevTags => {
          const updatedTags = [...prevTags];
          updatedTags[index] = '';
          return updatedTags;
        });
      }
    },
    [tagInputs]
  );

  const handleChangeFee = useCallback((index: number, value: string) => {
    setInvoiceData(prevData => {
      const updatedData = [...prevData];
      updatedData[index] = {
        ...updatedData[index],
        totalNet: {
          ...updatedData[index].totalNet,
          value: Number(value)
        }
      };
      return updatedData;
    });
  }, []);

  /** Remove a specialty tag at the given index from a firm's specialty list. */
  function handleRemoveTag(index: number, tagIndex: number) {
    setFirmData(prevData => {
      const updatedData = [...prevData];
      updatedData[index] = {
        ...updatedData[index],
        specialty: (updatedData[index].specialty ?? []).filter(
          (_: any, i: any) => i !== tagIndex
        )
      };
      return updatedData;
    });
  }

  const activeFirms = filteredFirmData?.filter(firm => firm.active);

  return (
    <>
      <div className='flex min-h-[calc(100vh-105px)] flex-col'>
        <div className='flex flex-1 flex-col overflow-hidden'>
          <ActiveFirmSection
            isLoading={isPractitionerRolesLoading}
            isFetching={isPractitionerRolesFetching}
            activeFirms={activeFirms}
          />

          <div className='mt-4 flex items-center gap-4'>
            <div className='flex w-full items-center justify-between rounded-lg bg-[#F9F9F9]'>
              <Input
                className='flex h-[50px] w-[85%] items-center space-x-2 rounded-lg border-none bg-[#F9F9F9] p-4'
                width={12}
                height={12}
                prefixIcon='/icons/search-cyan.svg'
                placeholder='Search Firm'
                name='searchInput'
                id='searchInput'
                type='text'
                backgroundColor='[#F9F9F9]'
                value={searchInput}
                opacity={false}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchInput(event.target.value)
                }
                outline={false}
              />
            </div>

            <FirmFilter
              onChange={(filter: IFirmFilter) => {
                setFirmFilter(prevState => ({
                  ...prevState,
                  ...filter
                }));
              }}
            />
          </div>

          <div>
            {firmFilter.city && (
              <Badge className='bg-secondary mt-4 rounded-md px-4 py-[3px] font-normal text-white'>
                {firmFilter.city}
              </Badge>
            )}
          </div>

          <div className='flex-1 overflow-y-auto pb-[15px]'>
            {
              // eslint-disable-next-line sonarjs/function-return-type
              (() => {
                if (isPractitionerRolesLoading || isPractitionerRolesFetching) {
                  return (
                    <Skeleton
                      count={4}
                      className='mt-4 h-[60px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
                    />
                  );
                }
                if (filteredFirmData && filteredFirmData.length > 0) {
                  return filteredFirmData.map(
                    (
                      firm: BundleEntry<IPractitionerRoleDetail>,
                      index: number
                    ) => (
                      <CollapsibleItem
                        key={firm.id}
                        index={index}
                        firm={firm as unknown as IPractitionerRoleDetail}
                        invoice={invoiceData[index]}
                        isOpen={openCollapsibles[index] ?? false}
                        onToggle={handleToggle}
                        tagInputs={tagInputs}
                        handleChangeFee={handleChangeFee}
                        handleAddTag={handleAddTag}
                        handleRemoveTag={handleRemoveTag}
                        setTagInputs={setTagInputs}
                        slotConfigs={slotConfigs}
                        setSlotConfigs={setSlotConfigs}
                      />
                    )
                  );
                }
                return (
                  <EmptyState
                    className='py-16'
                    title='No Firms Found'
                    subtitle='You have no firms registered at the moment'
                  />
                );
              })()
            }
          </div>
        </div>

        <div className='flex justify-center bg-white px-4 pt-4'>
          <div className='flex w-full max-w-screen-sm items-center justify-center'>
            <Button
              onClick={() => {
                void handleSubmitFirmsStatus();
              }}
              className='bg-secondary w-full rounded-[32px] py-2 font-normal text-white'
              disabled={isSaving}
            >
              {isSaving ? (
                <LoadingSpinnerIcon
                  width={20}
                  height={20}
                  stroke='white'
                  className='mx-auto animate-spin'
                />
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </div>

      <Drawer open={isDrawerOpen}>
        <DrawerTrigger />
        <DrawerContent className='mx-auto flex w-full max-w-screen-sm flex-col'>
          <DrawerHeader>
            <DrawerTitle className='text-center text-xl font-bold text-[#2C2F35] opacity-100'>
              Changes Successful!
            </DrawerTitle>
            <DrawerDescription className='text-center text-sm text-[#2C2F35] opacity-60'>
              Your edit to your practice information is successfully saved.
            </DrawerDescription>
          </DrawerHeader>
          <Button
            onClick={() => {
              setIsDrawerOpen(false);
              router.push('/profile');
            }}
            className='border-opacity-20 mx-4 mb-4 rounded-full border border-[#2C2F35] bg-white py-3 text-sm font-bold text-[#2C2F35] opacity-100'
          >
            Close
          </Button>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default EditPractice;
