'use client';

import Avatar from '@/components/general/avatar';
import CardLoader from '@/components/general/card-loader';
import EmptyState from '@/components/general/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { STORES, dbSet } from '@/lib/indexeddb';
import { IUseClinicParams } from '@/services/clinic';
import { IPractitioner } from '@/types/organization';
import {
  generateAvatarPlaceholder,
  mergeNames,
  parseTime
} from '@/utils/helper';
import {
  type BundleEntry,
  type CodeableConcept,
  type ContactPoint
} from 'fhir/r4';
import { HeartPulse, SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

/** Generate weekday short names between two dates. */
const generateFilterDays = (start: Date, end: Date): string[] => {
  const days: string[] = [];
  const cur = new Date(start);
  while (cur <= new Date(end)) {
    days.push(
      cur.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase()
    );
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

/** Check if a slot overlaps with the given filter range. */
const isSlotAvailable = ({
  slot,
  filterDays,
  filterStartTime,
  filterEndTime,
  practitionerStartTime,
  practitionerEndTime
}: {
  slot: { daysOfWeek?: string[] };
  filterDays: string[];
  filterStartTime: Date;
  filterEndTime: Date;
  practitionerStartTime: Date;
  practitionerEndTime: Date;
}) => {
  const slotDays = (slot.daysOfWeek ?? []).map(d => d.toLowerCase());
  if (!slotDays.some(d => filterDays.includes(d))) return false;
  return (
    practitionerStartTime <= filterEndTime &&
    practitionerEndTime >= filterStartTime
  );
};

/** Practitioner card sub-component. */
function PractitionerCard({
  p,
  clinicName
}: {
  p: IPractitioner;
  clinicName: string;
}) {
  const displayName = mergeNames(p.name ?? [], p.qualification);
  const email = p.telecom?.find((t: ContactPoint) => t.system === 'email');
  const { initials, backgroundColor, seed } = generateAvatarPlaceholder({
    id: p.id,
    name: displayName,
    email: email?.value
  });
  const photoUrl = p.photo?.[0]?.url;

  const handleSelect = () => {
    dbSet(STORES.uiPreferences, {
      ownerId: '',
      prefKey: 'selected_practitioner',
      value: {
        roleId: p.practitionerRole.id,
        name: p.name,
        photo: p.photo,
        qualification: p.qualification,
        email: email?.value
      }
    }).catch((err: unknown) => console.warn('[IndexedDB]', err));
  };

  return (
    <div key={p.id} className='card flex flex-col items-center'>
      <div className='relative flex justify-center'>
        <Avatar
          seed={seed}
          initials={initials ?? ''}
          backgroundColor={backgroundColor ?? ''}
          photoUrl={photoUrl}
          className='text-2xl'
        />
        <Badge className='absolute bottom-0 flex h-[24px] min-w-[100px] justify-center gap-1 bg-[#08979C] font-normal text-white'>
          <HeartPulse size={16} color='#08979C' fill='white' />
          <span className='whitespace-nowrap'>{clinicName}</span>
        </Badge>
      </div>
      <div className='text-primary mt-2 text-center font-bold'>
        {displayName}
      </div>
      <div className='mt-2 flex flex-wrap justify-center gap-1'>
        {p.practitionerRole.specialty?.map((s: CodeableConcept) => (
          <Badge
            key={s.text}
            className='bg-[#E1E1E1] px-2 py-[2px] font-normal'
          >
            {s.text}
          </Badge>
        ))}
      </div>
      <Link
        href={`/practitioner?id=${p.practitionerRole.id}`}
        className='mt-auto w-full'
      >
        <Button
          className='btn-soft-gray mt-2 w-full rounded-[32px] py-2 font-normal'
          onClick={handleSelect}
        >
          <b>View Practice Information</b>
        </Button>
      </Link>
    </div>
  );
}

/** Filter practitioners by keyword and date/time filters. */
function filterPractitioners(
  data: IPractitioner[],
  keyword: string,
  filter: IUseClinicParams
): IPractitioner[] {
  const noFilter =
    !keyword && Object.values(filter).every(v => v === undefined);
  if (noFilter) return data;

  const { start_date, end_date, start_time, end_time } = filter;
  const hasDate = start_date && end_date;
  const hasTime = start_time || end_time;
  const filterDays = hasDate ? generateFilterDays(start_date, end_date) : [];
  const fStart = parseTime(start_time || '00:00', 'HH:mm');
  const fEnd = parseTime(end_time || '23:59', 'HH:mm');
  const lowerKW = keyword.trim().toLowerCase();

  return data.filter(p => {
    const n = mergeNames(p.name ?? [], p.qualification);
    if (!n || (lowerKW && !n.trim().toLowerCase().includes(lowerKW)))
      return false;
    const at = p.practitionerRole.availableTime;
    if (!at?.length) return false;
    if (!hasDate && !hasTime) return true;
    return at.some(slot =>
      isSlotAvailable({
        slot,
        filterDays,
        filterStartTime: fStart,
        filterEndTime: fEnd,
        practitionerStartTime: parseTime(
          slot.availableStartTime ?? '00:00:00',
          'HH:mm:ss'
        ),
        practitionerEndTime: parseTime(
          slot.availableEndTime ?? '23:59:00',
          'HH:mm:ss'
        )
      })
    );
  });
}

/** Non-admin clinic detail view: practitioners list with search filter. */
export default function ClinicPractitionersView({
  entries,
  isFetching,
  isLoading
}: {
  entries: BundleEntry[] | undefined;
  isFetching: boolean;
  isLoading: boolean;
}) {
  const [keyword, setKeyword] = useState('');

  const orgEntry = entries?.find(
    e => e.resource?.resourceType === 'Organization'
  );
  const clinicName =
    ((orgEntry?.resource as unknown as Record<string, unknown>)
      ?.name as string) ?? '-';

  const practitionerRoles =
    entries?.filter(e => e.resource?.resourceType === 'PractitionerRole') ?? [];

  const practitionersData: IPractitioner[] = (entries ?? [])
    .filter(e => e.resource?.resourceType === 'Practitioner')
    .map((item: BundleEntry) => {
      const pid = item.resource?.id;
      const role = practitionerRoles.find(
        r =>
          (
            r.resource as unknown as { practitioner?: { reference?: string } }
          )?.practitioner?.reference?.split('/')[1] === pid
      );
      return {
        ...item.resource,
        practitionerRole: role?.resource ?? {}
      } as IPractitioner;
    });

  /** Filter practitioners by name and availability. */
  const filteredPractitioners = useMemo(
    () =>
      filterPractitioners(practitionersData, keyword, {} as IUseClinicParams),
    [practitionersData, keyword]
  );

  if (isLoading || isFetching || !filteredPractitioners) return <CardLoader />;

  return (
    <div className='mt-[-24px] rounded-[16px] bg-white p-4'>
      <Image
        className='h-[124px] w-full rounded-lg object-cover'
        src='/images/clinic.jpg'
        width={396}
        height={124}
        alt='detail-clinic'
      />
      <h3 className='mt-2 text-center text-[20px] font-bold'>{clinicName}</h3>

      <div className='card mt-2 border-0 bg-[#F9F9F9] p-4 text-[12px]'>
        <div className='mb-4 flex items-center gap-2 text-[14px]'>
          <Image
            src='/icons/hospital.svg'
            alt='clinic'
            width={22}
            height={22}
          />
          <div className='font-bold'>Clinic Information</div>
        </div>
        <div className='flex justify-between'>
          <span>Affiliation</span>
          <span className='font-bold'>Konsulin</span>
        </div>
        <div className='mt-2 flex flex-col'>
          <span>Address</span>
          <span className='font-bold'>Jakarta</span>
        </div>
      </div>

      <div className='mt-4 flex gap-4'>
        <InputWithIcon
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder='Search'
          className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
          startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
        />
      </div>

      {filteredPractitioners.length === 0 ? (
        <EmptyState
          className='py-16'
          title='No Practitioners Found'
          subtitle='Try Another Clinic.'
        />
      ) : (
        <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
          {practitionersData.map((p: IPractitioner) => (
            <PractitionerCard key={p.id} p={p} clinicName={clinicName} />
          ))}
        </div>
      )}
    </div>
  );
}
