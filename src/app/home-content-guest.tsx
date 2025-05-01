import AppChartClient from '../components/general/home/app-chart-client';
import AppMenu from '../components/general/home/app-menu';
import Community from '../components/general/home/community';
import PopularAssessment from '../components/general/home/popular-assessment';

export default function HomeContentGuest() {
  return (
    <>
      <AppChartClient isBlur={true} />

      {/* <div className='relative flex flex-col items-center justify-center p-4'>
        <div className='p-[16px]s min-h-[150px] w-full rounded-lg bg-[#F9F9F9] p-4'>
          <div className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
            What’s the turbulence on your mind?
          </div>
          <div className='mt-4 w-full blur-sm'>
            <div className='mb-4 flex w-full items-center justify-center'>
              <Image
                alt='chart'
                src={'/images/chart.png'}
                width={364}
                height={128}
              />
            </div>
            <div className='text-[10px]'>
              *based on your data previous record, not necessarily in recent
              period
            </div>
          </div>
        </div>

        <Link
          href='/login'
          className='absolute m-auto flex h-full w-full flex-grow items-center justify-center text-[14px] font-bold'
        >
          <Button className='bg-secondary text-white shadow-md'>
            Silakan Login untuk akses lengkap
          </Button>
        </Link>
      </div> */}

      <div className='flex gap-4 p-4'>
        <AppMenu />
      </div>

      <PopularAssessment />

      <div className='p-4'>
        <Community />
      </div>
    </>
  );
}
