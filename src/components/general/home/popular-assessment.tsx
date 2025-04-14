import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { usePopularAssessments } from '@/services/api/assessment';
import { IAssessmentEntry } from '@/types/assessment';
import Image from 'next/image';
import Link from 'next/link';
import CardLoader from '../card-loader';

export default function PopularAssessment() {
  const { data: popularAssessments, isLoading: popularLoading } =
    usePopularAssessments();

  return (
    <div className='bg-[#F9F9F9] p-4'>
      <div className='flex justify-between text-muted'>
        <span className='mb-2 text-[14px] font-bold'>Popular Assessment</span>
        <Link className='text-[12px]' href={'/assessments'}>
          See All
        </Link>
      </div>
      <div>
        <ScrollArea className='w-full whitespace-nowrap'>
          {popularLoading ? (
            <CardLoader item={2} />
          ) : (
            <div className='flex w-max space-x-4 pb-4'>
              {popularAssessments.map((assessment: IAssessmentEntry) => (
                <Link
                  key={assessment.resource.id}
                  href={`assessments/${assessment.resource.id}`}
                  className='card flex flex-col gap-4 bg-white'
                >
                  <div className='flex items-start justify-between'>
                    <Image
                      src={'/images/exercise.svg'}
                      height={40}
                      width={40}
                      alt='exercise'
                    />
                    <div className='flex min-w-[192px] justify-end gap-2'>
                      {/* NOTE: not provided by api */}
                      {/* <Badge className='flex items-center rounded-[8px] bg-secondary px-[10px] py-[4px]'> */}
                      {/*   <AwardIcon size={16} color='white' fill='white' /> */}
                      {/*   <div className='text-[10px] text-white'>Best Impact</div> */}
                      {/* </Badge> */}

                      {/* NOTE: not included in MVP 1.0 */}
                      {/* <Badge className='rounded-[8px] bg-secondary px-[10px] py-[4px]'> */}
                      {/*   <BookmarkIcon size={16} color='white' fill='white' /> */}
                      {/* </Badge> */}
                    </div>
                  </div>

                  <div className='mt-2 flex flex-col'>
                    {/* NOTE: not provided by api */}
                    {/* <span className='text-[10px] text-muted'>6 Minutes</span> */}
                    <span className='text-[12px] font-bold'>
                      {assessment.resource.title}
                    </span>
                    <span className='mt-2 max-w-[250px] overflow-hidden truncate text-ellipsis text-[10px] text-muted'>
                      {assessment.resource.description}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <ScrollBar orientation='horizontal' />
        </ScrollArea>
      </div>
    </div>
  );
}
