'use client';

import ContentWraper from '@/components/general/content-wraper';
import PageHeader from '@/components/page-header';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import EditResearchForm from './research-form';

/** Extract the last path segment from a FHIR reference string. */
const extractIdFromReference = (ref?: string): string | null => {
  if (!ref) return null;
  const parts = ref.split('/').filter(Boolean);
  return parts.at(-1) ?? null;
};

/** Edit page for an existing research study. */
export default function EditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state: authState, isLoading } = useAuth();
  const studyId = searchParams.get('id');

  const role = authState?.userInfo?.role_name;
  const isResearcher = role === Roles.Researcher;

  const [study, setStudy] = useState<ResearchStudy | null>(null);
  const [planDefinitions, setPlanDefinitions] = useState<PlanDefinition[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!isLoading && !isResearcher) {
      router.push('/');
    }
  }, [isLoading, isResearcher, router]);

  useEffect(() => {
    if (!studyId || !isResearcher) return;

    /** Fetch the current study and its linked PlanDefinitions from the FHIR API. */
    const fetchStudy = async () => {
      setIsFetching(true);
      try {
        const API = await getAPI();
        const studyRes = await API.get<ResearchStudy>(
          `/fhir/ResearchStudy/${studyId}`
        );
        setStudy(studyRes.data);

        const planRefs = studyRes.data.protocol ?? [];
        const planFetches = await Promise.all(
          planRefs.map(async ref => {
            const planId = extractIdFromReference(ref.reference);
            if (!planId) return null;
            try {
              const planRes = await API.get<PlanDefinition>(
                `/fhir/PlanDefinition/${planId}`
              );
              return planRes.data;
            } catch {
              return null;
            }
          })
        );
        setPlanDefinitions(
          planFetches.filter((p): p is PlanDefinition => p !== null)
        );
      } catch {
        setFetchError(true);
      } finally {
        setIsFetching(false);
      }
    };

    void fetchStudy();
  }, [studyId, isResearcher]);

  if (isLoading || !isResearcher) {
    return null;
  }

  if (!studyId) {
    return null;
  }

  if (fetchError) {
    return (
      <>
        <PageHeader />
        <ContentWraper className='pt-4'>
          <div className='px-4'>
            <p className='text-sm text-gray-500'>Study not found.</p>
          </div>
        </ContentWraper>
      </>
    );
  }

  if (isFetching || !study) {
    return (
      <>
        <PageHeader />
        <ContentWraper className='pt-4'>
          <div className='px-4'>
            <p className='text-sm text-gray-500'>Loading study...</p>
          </div>
        </ContentWraper>
      </>
    );
  }

  return (
    <>
      <PageHeader />
      <ContentWraper className='pt-4'>
        <div className='px-4'>
          <EditResearchForm study={study} planDefinitions={planDefinitions} />
        </div>
      </ContentWraper>
    </>
  );
}
