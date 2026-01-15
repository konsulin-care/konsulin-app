import CardLoader from '@/components/general/card-loader';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth/authContext';
import { useGetPractitionerSlots } from '@/services/api/appointments';
import { useRegularAssessments } from '@/services/api/assessment';
import { customMarkdownComponents } from '@/utils/helper';
import { Column, Datum } from '@ant-design/plots';
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { BundleEntry, Questionnaire, Slot } from 'fhir/r4';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Community from '../components/general/home/community';

type IColumn = {
  data: {
    type: string;
    value: number;
    displayValue: number;
    date: string;
  }[];
};

const today = new Date();
const monday = startOfWeek(today, { weekStartsOn: 1 });

export default function HomeContentClinician() {
  const router = useRouter();
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [dataWeekly, setDataWeekly] = useState<IColumn>({ data: [] });
  const [dataMonthly, setDataMonthly] = useState<IColumn>({ data: [] });
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const elementClickedRef = useRef(false);

  const { data: regularAssessments, isLoading: regularLoading } =
    useRegularAssessments();
  const { data: practitionerSlotsData, isLoading: isPractitionerSlotsLoading } =
    useGetPractitionerSlots({
      practitionerId: authState?.userInfo?.fhirId,
      dateReference: monday
    });

  useEffect(() => {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monthLabels = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];

    const weeklyMap: Record<string, { value: number; date: string }> =
      Object.fromEntries(
        weekDays.map((day, i) => [
          day,
          {
            value: 0,
            date: format(addDays(monday, i), 'yyyy-MM-dd')
          }
        ])
      );

    const monthlyMap: Record<string, { value: number; date: string }> =
      Object.fromEntries(
        monthLabels.map((month, i) => [
          month,
          {
            value: 0,
            date: format(
              startOfMonth(addMonths(new Date(today.getFullYear(), 0), i)),
              'yyyy-MM-dd'
            )
          }
        ])
      );

    if (practitionerSlotsData?.total > 0) {
      practitionerSlotsData.entry.forEach((item: BundleEntry<Slot>) => {
        const slot = item.resource;
        if (slot?.start && slot?.status === 'busy-unavailable') {
          const localDate = new Date(slot.start);
          const day = format(localDate, 'EEE'); // mon, tue, ...
          const month = format(localDate, 'MMM'); // jan, feb, ...

          if (weeklyMap[day]) {
            weeklyMap[day].value++;
            if (!weeklyMap[day].date) {
              weeklyMap[day].date = format(new Date(slot.start), 'yyyy-MM-dd');
            }
          }

          if (monthlyMap[month]) {
            monthlyMap[month].value++;
            if (!monthlyMap[month].date) {
              monthlyMap[month].date = format(
                new Date(slot.start),
                'yyyy-MM-dd'
              );
            }
          }
        }
      });
    }

    const dataWeekly: IColumn = {
      data: Object.entries(weeklyMap).map(([day, { value, date }]) => ({
        type: day,
        value: value === 0 ? 1 : value,
        displayValue: value,
        date
      }))
    };

    const dataMonthly: IColumn = {
      data: Object.entries(monthlyMap).map(([month, { value, date }]) => ({
        type: month,
        value: value === 0 ? 1 : value,
        displayValue: value,
        date
      }))
    };

    setDataWeekly(dataWeekly);
    setDataMonthly(dataMonthly);
  }, [practitionerSlotsData, authState.userInfo.fhirId]);

  const configColumn: any = {
    axis: {
      x: { title: null },
      y: false
    },
    xField: 'type',
    yField: 'value',
    style: {
      fill: ({ type, displayValue }) => {
        if (displayValue === 0) {
          return '#F9F9F9';
        }
        if (type === 'Sun') {
          return '#13C2C2';
        }
        return '#ABDCDB';
      },
      radius: 6,
      paddingBottom: 10,
      cursor: 'pointer',
      pointerEvents: ({ displayValue }) => {
        return displayValue === 0 ? 'none' : 'auto';
      }
    },
    label: {
      position: 'bottom',
      text: (originData: Datum) => originData.displayValue
    },
    legend: false,
    arrow: false,
    tooltip: false
  };

  const renderDrawerContent = (
    <div className='flex flex-col'>
      <DrawerHeader className='mx-auto text-[20px] font-bold'>
        <DrawerTitle className='text-center text-2xl'>
          {selectedAssessment?.title}
        </DrawerTitle>
      </DrawerHeader>
      <div className='card mt-4 border-0 bg-[#F9F9F9]'>
        <div className='font-bold'>Brief</div>
        <hr className='my-4 border-black opacity-10' />
        <div className='flex flex-wrap gap-[10px] text-sm'>
          <DrawerDescription>
            <ReactMarkdown components={customMarkdownComponents}>
              {selectedAssessment?.description}
            </ReactMarkdown>
          </DrawerDescription>
        </div>
      </div>

      <div className='mt-2 flex flex-col gap-2 py-4'>
        <Link href={`assessments/${selectedAssessment?.id}`}>
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

  return (
    <>
      <div className='p-4'>
        {isPractitionerSlotsLoading || isAuthLoading ? (
          <Skeleton className='h-[250px] w-full bg-[hsl(210,40%,96.1%)]' />
        ) : (
          <div className='rounded-lg bg-[#F9F9F9] p-[16px]'>
            <div className='mb-4 flex justify-between'>
              <div className='text-[14px] font-bold text-[#2C2F3599]'>
                Handled Sessions
              </div>
              <Link className='text-secondary text-[12px]' href={'/'}>
                Generate Report
              </Link>
            </div>
            <Tabs defaultValue='weekly' className='w-full'>
              <TabsList className='grid h-fit w-full grid-cols-2 bg-[#F4F4F4] p-2'>
                <TabsTrigger className='text-muted tab-active' value='weekly'>
                  Weekly
                </TabsTrigger>
                <TabsTrigger className='text-muted tab-active' value='monthly'>
                  Monthly
                </TabsTrigger>
              </TabsList>
              <TabsContent value='weekly'>
                <Column
                  height={180}
                  {...configColumn}
                  {...dataWeekly}
                  onReady={plot => {
                    plot.chart.on('element:click', (e: Datum) => {
                      elementClickedRef.current = true;
                      const date = e.data.data.date;
                      router.push(
                        `/schedule?start_date=${date}&end_date=${date}`
                      );
                    });

                    plot.chart.on('plot:click', () => {
                      setTimeout(() => {
                        if (elementClickedRef.current) {
                          elementClickedRef.current = false;
                          return;
                        }
                        const formatted = format(today, 'yyyy-MM-dd');
                        router.push(
                          `/schedule?start_date=${formatted}&end_date=${formatted}`
                        );
                      }, 0); // defer until after element:click
                    });
                  }}
                />
              </TabsContent>
              <TabsContent value='monthly'>
                <Column
                  height={180}
                  {...configColumn}
                  {...dataMonthly}
                  onReady={plot => {
                    plot.chart.on('element:click', (e: Datum) => {
                      elementClickedRef.current = true;
                      const clickedDate = new Date(e.data.data.date);

                      const start = format(
                        startOfMonth(clickedDate),
                        'yyyy-MM-dd'
                      );
                      const end = format(endOfMonth(clickedDate), 'yyyy-MM-dd');

                      router.push(
                        `/schedule?start_date=${start}&end_date=${end}`
                      );
                    });

                    plot.chart.on('plot:click', () => {
                      setTimeout(() => {
                        if (elementClickedRef.current) {
                          elementClickedRef.current = false;
                          return;
                        }
                        const formatted = format(today, 'yyyy-MM-dd');
                        router.push(
                          `/schedule?start_date=${formatted}&end_date=${formatted}`
                        );
                      }, 0); // defer until after element:click
                    });
                  }}
                />
              </TabsContent>
            </Tabs>
            <div className='text-[10px]'>
              *based on scheduled slot data for this week/month
            </div>
          </div>
        )}
      </div>
      <div className='flex gap-4 p-4'>
        <Link href={'/exercise'} className='card flex w-full'>
          <Image
            src={'/images/mental-health.svg'}
            width={40}
            height={40}
            alt='writing'
          />
          <div className='ml-2 flex flex-col'>
            <span className='text-primary text-[12px] font-bold'>
              Health Exercise Resources
            </span>
            <span className='text-primary text-[10px]'>
              Help your patient understand their health with curated exercise
              materials by Konsulin
            </span>
          </div>
        </Link>
        <Link href={'/assessments/soap'} className='card flex w-full'>
          <Image
            src={'/images/writing.svg'}
            width={40}
            height={40}
            alt='writing'
          />
          <div className='ml-2 flex flex-col'>
            <span className='text-primary text-[12px] font-bold'>
              SOAP Report
            </span>
            <span className='text-primary text-[10px]'>
              Record your session
            </span>
          </div>
        </Link>
      </div>
      <div className='p-4'>
        <div className='text-muted flex justify-between'>
          <span className='mb-2 text-[14px] font-bold'>Browse Instruments</span>
          <Link className='text-secondary text-[12px]' href={'/assessments'}>
            See All
          </Link>
        </div>

        {regularLoading ? (
          <CardLoader height='h-[50px]' item={4} />
        ) : (
          <div className='grid w-full grid-cols-2 gap-4'>
            {regularAssessments &&
              regularAssessments?.map(
                (assessment: BundleEntry<Questionnaire>) => (
                  <div
                    key={assessment.resource.id}
                    className='card item flex cursor-pointer flex-col p-2'
                    onClick={() => {
                      setSelectedAssessment(assessment.resource);
                      setIsOpen(true);
                    }}
                  >
                    <div className='flex items-center'>
                      <div className='mr-2 h-[40px] w-[40px] rounded-full bg-[#F8F8F8] p-2'>
                        <Image
                          className='h-[24px] w-[24px] object-cover'
                          src={'/images/note.svg'}
                          width={24}
                          height={24}
                          alt='note'
                        />
                      </div>
                      <div className='text-[12px] text-[hsla(220,9%,19%,1)]'>
                        {assessment.resource.title}
                      </div>
                    </div>
                  </div>
                )
              )}
          </div>
        )}
      </div>
      <div className='p-4'>
        <Community />
      </div>

      <Drawer open={isOpen} onClose={() => setIsOpen(false)}>
        <DrawerTrigger asChild>
          <div />
        </DrawerTrigger>
        <DrawerContent className='mx-auto w-full max-w-screen-sm p-4'>
          {renderDrawerContent}
        </DrawerContent>
      </Drawer>
    </>
  );
}
