'use client';

import type { ChiefComplaint } from '@/types/recommendation-interview';
import {
  getQuickComplaints,
  searchChiefComplaints
} from '@/utils/recommendation-interview';
import { SearchIcon, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ComplaintSearchProps {
  /** Called with the chosen complaint from a chip or suggestion. */
  onSelect: (complaint: ChiefComplaint) => void;
}

/**
 * Chief-complaint entry: search bar with auto-suggest plus top-5 quick chips.
 *
 * Search matches English + Indonesian labels and synonyms from the decision
 * tree. A dead-end query shows a graceful fallback instead of a blank list.
 *
 * @param props.onSelect - Emits the complaint the user picks
 */
export function ComplaintSearch({ onSelect }: Readonly<ComplaintSearchProps>) {
  const [query, setQuery] = useState('');

  const suggestions = useMemo(() => searchChiefComplaints(query), [query]);
  const quickChips = useMemo(() => getQuickComplaints(), []);
  const searching = query.trim().length > 0;
  const deadEnd = searching && suggestions.length === 0;

  return (
    <div>
      <div className='relative'>
        <SearchIcon
          className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400'
          aria-hidden='true'
        />
        <input
          type='search'
          value={query}
          onChange={event => {
            setQuery(event.target.value);
          }}
          placeholder='Search your concern (Indonesian or English)'
          aria-label='Search concern'
          className='w-full rounded-full border border-gray-200 bg-white py-2.5 pr-10 pl-10 text-[14px] outline-none focus:border-[var(--secondary)]'
        />
        {searching && (
          <button
            type='button'
            aria-label='Clear search'
            onClick={() => {
              setQuery('');
            }}
            className='absolute top-1/2 right-3 -translate-y-1/2 text-gray-400'
          >
            <X className='h-4 w-4' aria-hidden='true' />
          </button>
        )}
      </div>

      {deadEnd && (
        <p className='mt-3 rounded-lg bg-[#F9F9F9] p-3 text-center text-[12px] text-gray-500'>
          No matching concern found. Try a keyword like pain, mood, sleep, or
          breath.
        </p>
      )}

      {searching && !deadEnd && suggestions.length > 0 && (
        <ul className='mt-3 flex flex-col gap-2'>
          {suggestions.map(complaint => (
            <li key={complaint.id}>
              <button
                type='button'
                onClick={() => {
                  onSelect(complaint);
                }}
                className='w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-[14px] hover:border-[var(--secondary)]'
              >
                {complaint.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!searching && (
        <div className='mt-3'>
          <p className='mb-2 text-[12px] font-semibold text-gray-500'>
            Popular concerns
          </p>
          <div className='flex flex-wrap gap-2'>
            {quickChips.map(complaint => (
              <button
                key={complaint.id}
                type='button'
                onClick={() => {
                  onSelect(complaint);
                }}
                className='rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-700 hover:border-[var(--secondary)] hover:text-[var(--secondary)]'
              >
                {complaint.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplaintSearch;
