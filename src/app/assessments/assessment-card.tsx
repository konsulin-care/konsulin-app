'use client';

import {
  getQuestionnaireCategoryCode,
  getQuestionnaireCategoryLabel
} from '@/utils/fhir/questionnaire-category';
import {
  CATEGORY_DEFAULT_ICONS,
  getLucideIconName
} from '@/utils/fhir/questionnaire-icon';
import { getQuestionnaireImageUrl } from '@/utils/fhir/questionnaire-image';
import { questionnaireIdLabel } from '@/utils/fhir/questionnaire-url';
import { getQuestionnaireDuration } from '@/utils/fhir/service-duration';
import type { Questionnaire } from 'fhir/r4';
import type { LucideIcon } from 'lucide-react';
import {
  Accessibility,
  Activity,
  Brain,
  Building,
  CalendarDays,
  Clock,
  Heart,
  Sparkles,
  Users
} from 'lucide-react';
import Image from 'next/image';

interface AssessmentCardProps {
  readonly questionnaire: Questionnaire;
  readonly variant: 'featured' | 'compact';
  readonly onClick: () => void;
}

/** Map known Lucide icon names to their components at build time. */
const ICON_REGISTRY: Record<string, LucideIcon> = {
  Accessibility,
  Activity,
  Brain,
  Building,
  Heart,
  Sparkles,
  Users
};

/** Resolve a Lucide icon component by name, or null. */
function resolveIcon(name: string | null): LucideIcon | null {
  if (!name) return null;
  return ICON_REGISTRY[name] ?? null;
}

/** Resolve icon from questionnaire code, fall back to category default, or null. */
function useIcon(questionnaire: Questionnaire): LucideIcon | null {
  const iconName = getLucideIconName(questionnaire.code);
  if (iconName) {
    const Icon = resolveIcon(iconName);
    if (Icon) return Icon;
  }
  const categoryCode = getQuestionnaireCategoryCode(questionnaire.useContext);
  if (categoryCode) {
    const defaultName = CATEGORY_DEFAULT_ICONS[categoryCode];
    if (defaultName) return resolveIcon(defaultName);
  }
  return null;
}

/**
 * Assessment card with two variants:
 * - featured: wider card for the Editor's Picks rail
 * - compact: smaller card for the All Instruments grid
 *
 * Displays icon, title, category chip, duration, and description
 * (featured only). Clicking opens the assessment detail drawer.
 */
export default function AssessmentCard({
  questionnaire,
  variant,
  onClick
}: AssessmentCardProps) {
  const Icon = useIcon(questionnaire);
  const categoryLabel = getQuestionnaireCategoryLabel(questionnaire.useContext);
  const duration = getQuestionnaireDuration(questionnaire);
  const title =
    questionnaire.title ?? questionnaireIdLabel(questionnaire.id ?? '');

  if (variant === 'featured') {
    const FALLBACK_IMAGE_URL =
      'https://www.glasgowunisrc.org/pageassets/advice/health-and-wellbeing/AdobeStock_220793275-min.jpeg?thumbnail=true&height=465&width=620&resize_type=CropToFit';
    const imageUrl =
      getQuestionnaireImageUrl(questionnaire) ?? FALLBACK_IMAGE_URL;

    return (
      <button
        type='button'
        className='relative aspect-[4/3] h-[180px] w-auto flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl shadow-lg'
        onClick={onClick}
      >
        <Image
          src={imageUrl}
          alt={title}
          fill
          className='object-cover'
          sizes='(max-width: 640px) 100vw, 400px'
        />
        <div className='pointer-events-none absolute right-0 bottom-0 left-0 bg-black/50 backdrop-blur-md'>
          <div className='px-3 py-2 text-left'>
            <div className='truncate text-sm font-bold text-white'>{title}</div>
            <div className='flex items-center gap-2 text-xs text-white/80'>
              {categoryLabel && (
                <span className='rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-medium'>
                  {categoryLabel}
                </span>
              )}
              {duration != null && (
                <span className='flex items-center gap-1'>
                  <Clock className='size-3' />
                  {duration} min
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type='button'
      className='card flex cursor-pointer flex-col gap-2 p-3 text-left'
      onClick={onClick}
    >
      <div className='flex items-center gap-2'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#F8F8F8]'>
          {Icon ? (
            <Icon className='size-5' />
          ) : (
            <CalendarDays className='size-5 text-gray-400' />
          )}
        </div>
        <div className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate text-sm font-bold text-black'>{title}</span>
          {duration != null && (
            <span className='flex items-center gap-1 text-xs text-gray-500'>
              <Clock className='size-3' />
              {duration} min
            </span>
          )}
        </div>
      </div>
      {categoryLabel && (
        <span className='bg-primary/10 text-primary mr-auto rounded-md px-2 py-0.5 text-[10px] font-medium'>
          {categoryLabel}
        </span>
      )}
    </button>
  );
}
