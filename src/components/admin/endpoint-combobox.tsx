'use client';

import type { AdminEndpoint } from '@/lib/admin/endpoints';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Endpoint input with autocomplete suggestions grouped by resource type. */
export function EndpointCombobox({
  value,
  onSelect,
  groupedEndpoints
}: Readonly<{
  value: string;
  onSelect: (path: string) => void;
  groupedEndpoints: Map<string, AdminEndpoint[]>;
}>) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastCommittedRef = useRef(value);

  // Sync internal query with external value
  useEffect(() => {
    setQuery(value);
    lastCommittedRef.current = value;
  }, [value]);

  // Filter suggestions based on query
  const filteredGrouped = useMemo(() => {
    if (!query) return groupedEndpoints;
    const lower = query.toLowerCase();
    const filtered = new Map<string, AdminEndpoint[]>();
    for (const [group, endpoints] of groupedEndpoints) {
      const matches = endpoints.filter(ep =>
        ep.path.toLowerCase().includes(lower)
      );
      if (matches.length > 0) filtered.set(group, matches);
    }
    return filtered;
  }, [query, groupedEndpoints]);

  // Recalculate flat list for filtered results
  const filteredFlat = useMemo(() => {
    const flat: AdminEndpoint[] = [];
    for (const endpoints of filteredGrouped.values()) {
      flat.push(...endpoints);
    }
    return flat;
  }, [filteredGrouped]);

  const handleSelect = useCallback(
    (path: string) => {
      onSelect(path);
      setQuery(path);
      setOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onSelect]
  );

  const commitFreeForm = useCallback(() => {
    if (query !== lastCommittedRef.current) {
      lastCommittedRef.current = query;
      onSelect(query);
    }
  }, [query, onSelect]);

  /** Handles arrow-key navigation, Enter selection, and Escape close. */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredFlat.length - 1 ? prev + 1 : 0
        );
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredFlat.length - 1
        );
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredFlat.length) {
          handleSelect(
            // skipcq: JS-0017
            filteredFlat[highlightedIndex].path
          );
        } else {
          // No suggestion highlighted — commit the free-form value
          commitFreeForm();
          setOpen(false);
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
        break;
      }
      default: {
        break;
      }
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-suggestion]');
    // skipcq: JS-0072
    items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  return (
    <div className='relative'>
      <input
        ref={inputRef}
        type='text'
        aria-label='Endpoint'
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          // Delay to allow click on suggestion
          setTimeout(() => {
            setOpen(false);
            commitFreeForm();
          }, 150);
        }}
        onKeyDown={handleKeyDown}
        placeholder='Enter endpoint path…'
        className='h-10 w-full bg-transparent px-3 py-2 font-mono text-xs outline-none'
      />

      {open && filteredFlat.length > 0 && (
        <div
          ref={listRef}
          className='absolute top-full left-0 z-50 max-h-60 w-full overflow-y-auto rounded-b-md border border-t-0 border-slate-300 bg-white shadow-md'
        >
          {[...filteredGrouped].map(([group, endpoints]) => (
            <div key={group}>
              <div className='px-2 py-1.5 text-xs font-bold text-slate-500'>
                {group}
              </div>
              {endpoints.map(ep => {
                // skipcq: JS-0017
                const index = filteredFlat.indexOf(ep);
                return (
                  <button
                    key={ep.path}
                    type='button'
                    data-suggestion
                    className={`block w-full px-3 py-1.5 text-left font-mono text-xs hover:bg-slate-100 ${
                      index === highlightedIndex ? 'bg-slate-100' : ''
                    }`}
                    onMouseDown={e => {
                      e.preventDefault();
                      handleSelect(ep.path);
                    }}
                    onMouseEnter={() => {
                      setHighlightedIndex(index);
                    }}
                  >
                    {ep.path}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
