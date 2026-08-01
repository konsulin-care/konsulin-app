'use client';

import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import PageHeader from '@/components/page-header';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { useAuth } from '@/context/auth/authContext';
import { lazyComponent } from '@/lib/lazy-component';
import {
  useCuratedAssessments,
  useFeaturedAssessments
} from '@/services/api/assessment';
import { getQuestionnaireCategoryCode } from '@/utils/fhir/questionnaire-category';
import type { Questionnaire } from 'fhir/r4';
import { SearchIcon, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import AssessmentCard from './assessment-card';
import AssessmentsFilter, { type Filters } from './assessments-filter';
import FeaturedRail from './featured-rail';

const AssessmentDrawerContent = lazyComponent(
  () => import('./assessment-drawer'),
  { ssr: false }
);

/** Filter the curated list by search term and selected categories. */
function filterAssessments(
  assessments: Questionnaire[],
  searchTerm: string,
  filters: Filters
): Questionnaire[] {
  let result = assessments;

  // Text search on title + description
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    result = result.filter(
      a =>
        a.title?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
    );
  }

  // Category filter
  if (filters.categories.length > 0) {
    result = result.filter(a => {
      const code = getQuestionnaireCategoryCode(a.useContext);
      return code != null && filters.categories.includes(code);
    });
  }

  return result;
}

/** Grid content with loading, empty, and result states. */
function InstrumentsGrid({
  isLoading,
  instruments,
  searchTerm,
  onAssessmentClick
}: {
  isLoading: boolean;
  instruments: Questionnaire[];
  searchTerm: string;
  onAssessmentClick: (q: Questionnaire) => void;
}) {
  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-16 text-sm text-gray-400'>
        Loading...
      </div>
    );
  }

  if (instruments.length === 0) {
    const subtitle = searchTerm
      ? 'Try a different search term or clear filters.'
      : 'No instruments match the selected filters.';
    return (
      <EmptyState
        className='py-16'
        title='No instruments found'
        subtitle={subtitle}
      />
    );
  }

  return (
    <div className='grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3'>
      {instruments.map(q => (
        <AssessmentCard
          key={q.id}
          questionnaire={q}
          variant='compact'
          onClick={() => onAssessmentClick(q)}
        />
      ))}
    </div>
  );
}

/** Full assessments hub page. */
export default function AssessmentsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const baseUrl = globalThis.window?.location.origin ?? '';
  const isDrawerOpenParam = searchParams.get('isDrawerOpen') === 'true';
  const assessmentIdParam = searchParams.get('assessmentId');

  const { state: authState } = useAuth();
  const [isPending, startTransition] = useTransition();
  const { data: curated = [], isLoading: curatedLoading } =
    useCuratedAssessments();
  const { data: featured = [], isLoading: featuredLoading } =
    useFeaturedAssessments();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({
    categories: [],
    sort: 'a-z'
  });

  const [selectedAssessment, setSelectedAssessment] =
    useState<Questionnaire | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('');

  const isPractitioner = authState?.userInfo?.role_name === 'practitioner';

  const filtered = useMemo(
    () => filterAssessments(curated, searchTerm, filters),
    [curated, searchTerm, filters]
  );

  /** Find a questionnaire by ID from the curated list. */
  const findAssessmentById = (id: string) =>
    curated.find(q => q.id === id) ?? null;

  // Restore drawer state from URL on mount
  useEffect(() => {
    if (isDrawerOpenParam && assessmentIdParam) {
      const found = findAssessmentById(assessmentIdParam);
      if (found) {
        setSelectedAssessment(found);
        setIsOpen(true);
        setCurrentLocation(`${baseUrl}${pathname}?${searchParams.toString()}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Open drawer for an assessment. */
  const handleAssessmentClick = (assessment: Questionnaire) => {
    if (!assessment?.id) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('isDrawerOpen', 'true');
    params.set('assessmentId', assessment.id);
    router.push(`?${params.toString()}`, { scroll: false });
    setSelectedAssessment(assessment);
    setIsOpen(true);
    setCurrentLocation(`${baseUrl}${pathname}?${params.toString()}`);
  };

  /** Close drawer. */
  const handleDrawerClose = () => {
    setIsOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('isDrawerOpen');
    params.delete('assessmentId');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleRemoveCategory = (cat: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== cat)
    }));
  };

  const hasActiveFilters =
    filters.categories.length > 0 || searchTerm.length > 0;

  const isLoading = curatedLoading || featuredLoading;

  return (
    <>
      <PageHeader />

      <ContentWraper className='pt-4'>
        {/* Search + Filter */}
        <div className='flex items-center gap-2 px-4'>
          <InputWithIcon
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder='Search Assessment'
            className='h-[50px] w-full border-0 bg-[#F9F9F9]'
            startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
          />
          <AssessmentsFilter onChange={setFilters} />
        </div>

        {/* Active filter badges */}
        {hasActiveFilters && (
          <div className='flex flex-wrap items-center gap-2 px-4 pt-2'>
            {filters.categories.map(cat => (
              <span
                key={cat}
                className='bg-secondary flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white'
              >
                {cat}
                <button
                  type='button'
                  onClick={() => handleRemoveCategory(cat)}
                  className='ml-1 cursor-pointer'
                  aria-label={`Remove ${cat} filter`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            {searchTerm && (
              <span className='bg-secondary flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white'>
                Search: {searchTerm}
                <button
                  type='button'
                  onClick={() => setSearchTerm('')}
                  className='ml-1 cursor-pointer'
                  aria-label='Clear search'
                >
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              type='button'
              onClick={() => {
                setSearchTerm('');
                setFilters({ categories: [], sort: 'a-z' });
              }}
              className='text-xs text-gray-500 underline'
            >
              Clear all
            </button>
          </div>
        )}

        {/* Featured Rail */}
        {!searchTerm && filters.categories.length === 0 && (
          <FeaturedRail
            questionnaires={featured}
            onAssessmentClick={handleAssessmentClick}
          />
        )}

        {/* Instruments Grid */}
        <div className='px-4 pt-4'>
          <h2 className='mb-2 text-sm font-bold text-gray-700'>
            {searchTerm || filters.categories.length > 0
              ? `Results (${filtered.length})`
              : `All Instruments (${curated.length})`}
          </h2>

          <InstrumentsGrid
            isLoading={isLoading}
            instruments={filtered}
            searchTerm={searchTerm}
            onAssessmentClick={handleAssessmentClick}
          />
        </div>
      </ContentWraper>

      <Drawer onClose={handleDrawerClose} open={isOpen}>
        <DrawerContent className='mx-auto max-w-screen-sm p-4'>
          <AssessmentDrawerContent
            selectedAssessment={selectedAssessment}
            researchUrl=''
            currentLocation={currentLocation}
            isPending={isPending}
            isPractitioner={isPractitioner}
            onClose={handleDrawerClose}
            startTransition={startTransition}
            router={router}
          />
        </DrawerContent>
      </Drawer>
    </>
  );
}
