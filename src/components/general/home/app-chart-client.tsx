import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

import { useAuth } from '@/context/auth/authContext';
import { cn } from '@/lib/utils';
import { useQuestionnaireResponse } from '@/services/api/assessment';
import { Datum, Pie } from '@ant-design/charts';
import { BundleEntry, QuestionnaireResponseItem } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const DUMMY_DATA = [
  {
    type: 'Openness',
    value: 16
  },
  {
    type: 'Conscientiousness',
    value: 19
  },
  {
    type: 'Extroversion',
    value: 16
  },
  {
    type: 'Agreeableness',
    value: 20
  },
  {
    type: 'Neuroticism',
    value: 26
  }
];

export default function AppChartClient({
  isBlur = false
}: {
  isBlur?: boolean;
}) {
  const router = useRouter();
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const { data: questionnaireResponse, isInitialLoading } =
    useQuestionnaireResponse({
      patientId: authState.userInfo.fhirId,
      enabled: !!authState.userInfo.fhirId
    });
  const [latestResponse, setLatestResponse] = useState(null);
  const latestRecordIdRef = useRef(null);

  const isGuest = !authState.isAuthenticated;

  /* preparing data for the pie chart based on the latest response */
  useEffect(() => {
    if (!questionnaireResponse || questionnaireResponse.total === 0) return;

    const sorted = questionnaireResponse.entry.sort(
      (a: BundleEntry, b: BundleEntry) => {
        const dateA = new Date(a.resource.meta.lastUpdated);
        const dateB = new Date(b.resource.meta.lastUpdated);

        return dateB.getTime() - dateA.getTime();
      }
    );

    const latestData = sorted[0].resource;
    if (latestData && latestData.id) {
      latestRecordIdRef.current = latestData.id;
    }

    const interpretationItem = latestData.item.find(
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
  }, [questionnaireResponse, authState.userInfo.fhirId]);

  const hasRealData = latestResponse && latestResponse.length > 0;
  const chartData = hasRealData ? latestResponse : DUMMY_DATA;

  /* blur if it's a guest or the patient doesn't have any OCEAN records */
  const shouldBlur = isBlur || !hasRealData;
  const buttonText = isGuest
    ? 'Silakan Daftar atau Masuk untuk Mengakses Fitur Ini'
    : 'Isi Assessment Big Five Inventory';

  const configPie: any = {
    data: chartData,
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
    },
    tooltip: {
      items: [
        (datum: Datum) => ({
          name: datum.type,
          value: ''
        })
      ]
    }
  };

  if (isInitialLoading || isAuthLoading) {
    return (
      <div className='p-4'>
        <Skeleton className='h-[250px] w-full bg-[hsl(210,40%,96.1%)]' />
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
            'blur-sm': shouldBlur
          })}
        >
          <div className='min-h-[150px]'>
            <Pie
              {...configPie}
              height={180}
              style={{ cursor: 'pointer' }}
              onReady={plot => {
                plot.chart.on('element:click', () => {
                  if (latestRecordIdRef.current) {
                    router.push(
                      `/record/${latestRecordIdRef.current}?category=1&title=big-five-inventory`
                    );
                  }
                });
              }}
            />
          </div>
          {hasRealData && (
            <div className='text-[10px]'>
              *based on your data previous record, not necessarily in recent
              period
            </div>
          )}
        </div>
      </div>

      {shouldBlur && (
        <Link
          href={isGuest ? '/auth' : '/assessments/big-five-inventory'}
          className='absolute m-auto flex h-full w-full flex-grow items-center justify-center text-[14px] font-bold'
        >
          <Button className='bg-secondary text-white shadow-md'>
            {buttonText}
          </Button>
        </Link>
      )}
    </div>
  );
}
