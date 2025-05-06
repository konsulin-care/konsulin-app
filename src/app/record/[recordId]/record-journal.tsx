import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetSingleRecord } from '@/services/api/record';
import { format } from 'date-fns';
import { FileCheckIcon, NotepadTextIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Props = {
  journalId: string;
};

export default function RecordJournal({ journalId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const titleParam = searchParams?.get('title');
  const categoryParam = searchParams?.get('category');
  const { data: journalData, isLoading } = useGetSingleRecord(journalId);

  const formattedDate = (date: string) => {
    return format(new Date(date), 'dd MMMM yyyy');
  };

  return (
    <>
      {isLoading || !journalData ? (
        <div className='flex flex-col gap-4'>
          <Skeleton
            count={3}
            className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
          />
        </div>
      ) : (
        <>
          <div className='card flex items-center bg-[hsla(0,0%,98%,1)]'>
            <FileCheckIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />

            <div className='flex grow flex-col'>
              <span className='text-[10px] text-muted'>Journal Create</span>
              <span className='text-[14px] font-bold'>
                {journalData.effectiveDateTime &&
                  formattedDate(journalData.effectiveDateTime)}
              </span>
            </div>
            <div className='flex flex-col'>
              <span className='text-right text-[10px] text-muted'>
                Last Edit
              </span>
              <span className='text-right text-[14px] font-bold'>
                {journalData.meta.lastUpdated &&
                  formattedDate(journalData.meta.lastUpdated)}
              </span>
            </div>
          </div>

          <div className='card flex border'>
            <NotepadTextIcon
              className='mr-[10px]'
              color='hsla(220,9%,19%,0.4)'
            />
            <div>{journalData.valueString}</div>
          </div>

          {journalData.note.map((item: { text: string }, index: number) => {
            return (
              <div key={index}>
                <div className='mb-2 text-[12px] text-muted'>
                  Write anything here
                </div>

                <div className='card flex text-[14px]'>
                  <div>{item.text}</div>
                </div>
              </div>
            );
          })}

          <Button
            onClick={() =>
              router.push(
                `${pathname}/edit?category=${categoryParam}&title=${titleParam}`
              )
            }
            className='!mt-auto w-full rounded-full bg-secondary p-4 text-[14px] text-white'
          >
            Edit Journal
          </Button>
        </>
      )}
    </>
  );
}
