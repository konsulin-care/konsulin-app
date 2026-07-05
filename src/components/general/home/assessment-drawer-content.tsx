import { Button } from '@/components/ui/button';
import {
  DrawerClose,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { customMarkdownComponents } from '@/utils/helper';
import type { Questionnaire } from 'fhir/r4';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

/** Assessment drawer content with brief description and start button. */
export default function AssessmentDrawerContent({
  assessment
}: {
  assessment: Questionnaire | null;
}) {
  return (
    <div className='flex flex-col'>
      <DrawerHeader className='mx-auto text-[20px] font-bold'>
        <DrawerTitle className='text-center text-2xl'>
          {assessment?.title}
        </DrawerTitle>
      </DrawerHeader>
      <div className='card mt-4 border-0 bg-[#F9F9F9]'>
        <div className='font-bold'>Brief</div>
        <hr className='my-4 border-black opacity-10' />
        <div className='flex flex-wrap gap-[10px] text-sm'>
          <DrawerDescription>
            <ReactMarkdown components={customMarkdownComponents}>
              {assessment?.description ?? ''}
            </ReactMarkdown>
          </DrawerDescription>
        </div>
      </div>
      <div className='mt-2 flex flex-col gap-2 py-4'>
        <Link href={`/assessments?id=${assessment?.id}`}>
          <Button className='bg-secondary h-full w-full rounded-xl p-4 text-white'>
            Start Test
          </Button>
        </Link>
        <DrawerClose className='focus:ring-opacity-50 items-center justify-center rounded-xl border-transparent bg-transparent p-4 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 focus:outline-none'>
          Close
        </DrawerClose>
      </div>
    </div>
  );
}
