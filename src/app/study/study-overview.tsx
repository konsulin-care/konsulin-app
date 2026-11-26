import { useTranslations } from '@/i18n';
import type { GetBackItem, StudyKind } from './study-facts';

export type OverviewStatus = 'open' | 'needs_you' | 'shared' | 'closed';

export interface OverviewQuestionnaire {
  id: string;
  title: string;
  done?: boolean;
  shared?: boolean;
}

export interface StudyOverviewProps {
  title?: string;
  headingLevel?: 'h1' | 'h2' | 'h3';
  group?: string;
  lead?: string;
  status?: OverviewStatus;
  question?: string;
  description?: string;
  minutes?: number;
  kind?: StudyKind;
  openUntil?: string;
  whoCanJoin?: string;
  questionnaires?: OverviewQuestionnaire[];
  getBack?: GetBackItem[];
  joined?: boolean;
}

type Translate = (
  key: string,
  values?: Record<string, string | number>
) => string;

/**
 * Builds the kind fact text.
 * @param kind - study kind, if known
 * @param t - translator
 * @returns text or undefined
 */
function describeKind(
  kind: StudyKind | undefined,
  t: Translate
): string | undefined {
  if (!kind) return undefined;
  if (kind.kind === 'one-time') return t('overview.kind_one_time');
  return t('overview.kind_batch', { index: kind.index, total: kind.total });
}

const EMPTY_QUESTIONNAIRES: OverviewQuestionnaire[] = [];
const EMPTY_GET_BACK: GetBackItem[] = [];

/**
 * Shared presentational block for a study (study page and form preview).
 * @param props - study fields; any missing field is omitted
 * @returns the overview section
 */
export default function StudyOverview(props: StudyOverviewProps) {
  const t = useTranslations('research');
  const Heading = props.headingLevel ?? 'h2';
  const items = props.questionnaires ?? EMPTY_QUESTIONNAIRES;
  const getBack = props.getBack ?? EMPTY_GET_BACK;
  const kicker =
    props.group && props.lead
      ? t('overview.kicker', { group: props.group, name: props.lead })
      : props.group;
  const kindText = describeKind(props.kind, t);
  const facts: Array<[string, string | undefined]> = [
    [
      t('overview.fact_time'),
      props.minutes === undefined
        ? undefined
        : t('overview.time_value', { minutes: props.minutes })
    ],
    [t('overview.fact_kind'), kindText],
    [t('overview.fact_open_until'), props.openUntil],
    [t('overview.fact_who'), props.whoCanJoin]
  ];
  return (
    <section className='flex flex-col gap-4'>
      {kicker ? (
        <p className='text-muted-foreground text-sm'>{kicker}</p>
      ) : null}
      {props.status ? (
        <span className='border-border inline-flex w-fit rounded-lg border px-2 py-1 text-sm'>
          {t(`overview.status_${props.status}`)}
        </span>
      ) : null}
      {props.title ? (
        <Heading className='text-2xl font-extrabold tracking-tight md:text-3xl'>
          {props.title}
        </Heading>
      ) : null}
      {props.question ? (
        <p className='text-xl font-semibold'>{props.question}</p>
      ) : null}
      {props.description ? (
        <p className='text-sm'>{props.description}</p>
      ) : null}
      <dl className='flex flex-col gap-2 text-sm'>
        {facts.map(([label, value]) =>
          value ? (
            <div key={label}>
              <dt className='text-muted-foreground'>{label}</dt>
              <dd>{value}</dd>
            </div>
          ) : null
        )}
      </dl>
      {items.length > 0 ? (
        <div>
          <h3 className='text-sm font-semibold'>
            {t('overview.answer_heading')}
          </h3>
          <ul className='text-sm'>
            {items.map(q => (
              <li key={q.id}>
                {q.title}
                {q.shared ? ` (${t('overview.shared')})` : ''}
                {props.joined && q.done ? <span aria-hidden> ✓</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {getBack.length > 0 ? (
        <div>
          <h3 className='text-sm font-semibold'>
            {t('overview.get_back_heading')}
          </h3>
          <ul className='text-sm'>
            {getBack.map(key => (
              <li key={key}>{t(`overview.get_back_${key}`)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
