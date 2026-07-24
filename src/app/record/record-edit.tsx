'use client';

import Notfound from '@/app/not-found';
import EditJournal from '@/components/journal/edit';
import PageHeader from '@/components/page-header';

type Props = {
  readonly resourceType: string;
  readonly resourceId: string;
};

/** Map resource type to edit page title. */
function editPageTitle(resourceType: string): string {
  if (resourceType === 'Observation') {
    return 'Journaling';
  }

  return 'Edit';
}

/**
 * Record edit route dispatcher.
 *
 * Renders the appropriate edit form based on resource type.
 * Follows the same pattern as /record?view= for consistency.
 */
export default function RecordEdit({ resourceType, resourceId }: Props) {
  if (!resourceType || !resourceId) {
    return <Notfound />;
  }

  /** Render the edit form for the given resource type. */
  const renderEdit = () => {
    if (resourceType === 'Observation') {
      return <EditJournal journalId={resourceId} />;
    }

    return <Notfound />;
  };

  return (
    <>
      <PageHeader
        pageIndicator={editPageTitle(resourceType)}
        backRoute={`/record?view=${resourceType}/${resourceId}`}
      />
      <div className='mt-[-24px] flex grow flex-col space-y-4 rounded-[16px] bg-white p-4'>
        {renderEdit()}
      </div>
    </>
  );
}
