'use client';

import FilterDrawerTrigger from '@/components/shared/filter-drawer-trigger';
import AppDrawer from '@/components/ui/app-drawer';
import { Button } from '@/components/ui/button';
import { ASSESSMENT_CATEGORIES } from '@/constants/assessment-categories';
import { useState } from 'react';

export interface Filters {
  categories: string[];
  sort: 'a-z' | 'popular' | 'newest';
}

interface AssessmentsFilterProps {
  readonly onChange: (filters: Filters) => void;
}

const SORT_OPTIONS = [
  { value: 'a-z' as const, label: 'A–Z' },
  { value: 'popular' as const, label: 'Most Popular' },
  { value: 'newest' as const, label: 'Newest' }
];

/**
 * Filter drawer for assessments.
 *
 * Provides category checkboxes and sort selection in a bottom drawer.
 * Active filters are tracked and emitted via onChange on apply.
 */
export default function AssessmentsFilter({
  onChange
}: AssessmentsFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState<
    'a-z' | 'popular' | 'newest'
  >('a-z');

  /** Toggles a category code in the selected categories list. */
  const handleCategoryToggle = (code: string) => {
    setSelectedCategories(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  /** Applies the selected categories and sort order to the parent. */
  const handleApply = () => {
    setIsOpen(false);
    onChange({ categories: selectedCategories, sort: selectedSort });
  };

  return (
    <AppDrawer
      open={isOpen}
      onClose={() => setIsOpen(false)}
      trigger={<FilterDrawerTrigger onClick={() => setIsOpen(true)} />}
      title='Filter'
      ctaLabel='Apply'
      onCtaClick={handleApply}
    >
      <div className='mt-4'>
        <h3 className='mb-2 text-sm font-semibold text-gray-700'>Category</h3>
        <div className='flex flex-col gap-2'>
          {ASSESSMENT_CATEGORIES.map(cat => (
            <label
              key={cat.code}
              className='flex cursor-pointer items-center gap-2 text-sm'
            >
              <input
                type='checkbox'
                checked={selectedCategories.includes(cat.code)}
                onChange={() => handleCategoryToggle(cat.code)}
                className='size-4 accent-[var(--secondary)]'
                aria-label={cat.label}
              />
              {cat.label}
            </label>
          ))}
        </div>
      </div>

      <div className='mt-4'>
        <h3 className='mb-2 text-sm font-semibold text-gray-700'>Sort</h3>
        <div className='flex flex-wrap gap-2'>
          {SORT_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={selectedSort === opt.value ? 'default' : 'outline'}
              size='sm'
              onClick={() => setSelectedSort(opt.value)}
              className={
                selectedSort === opt.value
                  ? 'bg-secondary text-white'
                  : 'border-gray-300 bg-white text-gray-700'
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    </AppDrawer>
  );
}
