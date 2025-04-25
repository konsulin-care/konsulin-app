import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import useLoaded from '@/hooks/useLoaded';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { useQuestionnaireResponse } from '@/services/api/assessment';
import { Pie } from '@ant-design/charts';
import { BundleEntry, QuestionnaireResponseItem } from 'fhir/r4';
import { useEffect, useState } from 'react';

// NOTE: will remove this later
const QUESTIONNAIRE_ID = 'big-five-inventory';
const PATIENT_ID = 'Patient-id';

export default function AppChartClient({
  isBlur = false
}: {
  isBlur?: boolean;
}) {
  const { isLoaded } = useLoaded();
  const { data: questionnaireResponse, isLoading } = useQuestionnaireResponse(
    QUESTIONNAIRE_ID,
    PATIENT_ID
  );
  const [latestResponse, setLatestResponse] = useState(null);

  /* preparing data for then pie chart based on the latest response */
  useEffect(() => {
    if (!questionnaireResponse) return;

    const sorted = questionnaireResponse.entry.sort(
      (a: BundleEntry, b: BundleEntry) => {
        const dateA = new Date(a.resource.meta.lastUpdated);
        const dateB = new Date(b.resource.meta.lastUpdated);

        return dateB.getTime() - dateA.getTime();
      }
    );

    const latestData = sorted[0].resource.item;
    const interpretationItem = latestData.find(
      (item: QuestionnaireResponseItem) => item.linkId === 'interpretation'
    );

    const sum = interpretationItem.item[0].item
      .filter((item: QuestionnaireResponseItem) => item.linkId !== 'reference')
      .reduce((total: number, item: QuestionnaireResponseItem) => {
        return total + (item.answer[0]?.valueInteger || 0);
      }, 0);

    const result = interpretationItem.item[0].item
      .filter((item: QuestionnaireResponseItem) => item.linkId !== 'reference')
      .map((item: QuestionnaireResponseItem) => {
        const value = (item.answer[0]?.valueInteger / sum) * 100;
        return {
          type: item.text,
          value: Math.floor(value)
        };
      });

    setLatestResponse(result);
  }, [questionnaireResponse]);

  const configPie: any = {
    data: latestResponse,
    angleField: 'value',
    colorField: 'type',
    innerRadius: 0.5,
    scale: { color: { palette: 'BuGn' } },
    legend: {
      color: {
        title: false,
        position: 'right',
        rowPadding: 4
      }
    }
  };

  if (!isLoaded || isLoading || !latestResponse) {
    return (
      <div className='p-4'>
        <Skeleton className='h-[250px] w-full' />
      </div>
    );
  }

  return (
    <div className='relative flex flex-col items-center justify-center p-4'>
      <div className='p-[16px]s h-[250px] w-full rounded-lg bg-[#F9F9F9] p-4'>
        <div className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
          What’s the turbulence on your mind?
        </div>
        <div
          className={cn('w-full', {
            'blur-sm': isBlur
          })}
        >
          <div className='min-h-[150px]'>
            <Pie height={180} {...configPie} />
          </div>
          <div className='text-[10px]'>
            *based on your data previous record, not necessarily in recent
            period
          </div>
        </div>
      </div>

      <Link
        href='/register?role=patient'
        className={
          isBlur
            ? 'absolute m-auto flex h-full w-full flex-grow items-center justify-center text-[14px] font-bold'
            : 'hidden'
        }
      >
        <Button className='bg-secondary text-white shadow-md'>
          Silakan Daftar atau Masuk untuk Mengakses Fitur Ini
        </Button>
      </Link>
    </div>
  );
}
