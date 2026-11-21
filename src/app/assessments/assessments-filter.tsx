'use client';

import FilterDrawerTrigger from '@/components/shared/filter-drawer-trigger';
import AppDrawer from '@/components/ui/app-drawer';
import { Button } from '@/components/ui/button';
import { ASSESSMENT_CATEGORIES } from '@/constants/assessment-categories';
import { useTranslations } from '@/i18n';
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
  const t = useTranslations('assessment');
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
      title={t('filter')}
      ctaLabel={t('apply')}
      onCtaClick={handleApply}
    >
      <div className='mt-4'>
        <h3 className='text-charcoal-700 mb-2 text-sm font-semibold'>
          {t('category')}
        </h3>
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
                className='size-4 accent-[var(--color-turquoise-deep)]'
                aria-label={t(`category.${cat.code}`)}
              />
              {t(`category.${cat.code}`)}
            </label>
          ))}
        </div>
      </div>

      <div className='mt-4'>
        <h3 className='text-charcoal-700 mb-2 text-sm font-semibold'>
          {t('sort')}
        </h3>
        <div className='flex flex-wrap gap-2'>
          {SORT_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={selectedSort === opt.value ? 'default' : 'outline'}
              size='sm'
              onClick={() => setSelectedSort(opt.value)}
              className={
                selectedSort === opt.value
                  ? 'bg-accent text-accent-foreground ring-turquoise-deep ring-1'
                  : 'border-border bg-card text-foreground'
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
