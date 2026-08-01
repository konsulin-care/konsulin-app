'use client';

import FilterDrawerTrigger from '@/components/shared/filter-drawer-trigger';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle
} from '@/components/ui/drawer';
import { useState } from 'react';

export interface Filters {
  categories: string[];
  sort: 'a-z' | 'popular' | 'newest';
}

interface AssessmentsFilterProps {
  readonly onChange: (filters: Filters) => void;
}

const CATEGORIES = [
  { code: 'physical-health', label: 'Physical Health' },
  {
    code: 'mental-emotional-health',
    label: 'Mental & Emotional Health'
  },
  {
    code: 'social-health-relationships',
    label: 'Social Health & Relationships'
  },
  { code: 'functional-capacity', label: 'Functional Capacity' },
  {
    code: 'meaning-purpose-fulfilment',
    label: 'Meaning, Purpose & Fulfilment'
  },
  {
    code: 'health-behaviours-lifestyle',
    label: 'Health Behaviours & Lifestyle'
  },
  {
    code: 'environmental-contextual',
    label: 'Environmental & Contextual'
  }
];

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

  const handleCategoryToggle = (code: string) => {
    setSelectedCategories(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleApply = () => {
    setIsOpen(false);
    onChange({ categories: selectedCategories, sort: selectedSort });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <Drawer
      onClose={() => setIsOpen(false)}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <FilterDrawerTrigger onClick={() => setIsOpen(true)} />
      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
        <DrawerTitle className='mx-auto text-lg font-bold'>Filter</DrawerTitle>
        <DrawerDescription />

        <div className='mt-4'>
          <h3 className='mb-2 text-sm font-semibold text-gray-700'>Category</h3>
          <div className='flex flex-col gap-2'>
            {CATEGORIES.map(cat => (
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

        <Button
          className='bg-secondary mt-6 w-full rounded-xl py-3 text-white'
          onClick={handleApply}
        >
          Apply
        </Button>
      </DrawerContent>
    </Drawer>
  );
}
