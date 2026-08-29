'use client';

import type { ReactNode } from 'react';

interface HeaderReminderProps {
  /** True when the upcoming session starts today or tomorrow. */
  isSessionUrgent: boolean;
  /** Upcoming session card; undefined when no session or role-gated. */
  session?: ReactNode;
  /** Research progress card; undefined when research is not eligible. */
  research?: ReactNode;
}

/**
 * Renders a single static header reminder card, prioritizing the urgent
 * upcoming session, then the research progress card, then the session card
 * as a fallback for roles that cannot see research. No carousel, autoplay,
 * or observers: the chosen card is decided from props alone.
 */
export default function HeaderReminder({
  isSessionUrgent,
  session,
  research
}: Readonly<HeaderReminderProps>) {
  const content = isSessionUrgent ? session : (research ?? session);
  if (content === undefined || content === null) return null;
  return (
    <div className='mt-4' data-testid='header-reminder'>
      {content}
    </div>
  );
}
