import Image from 'next/image';
import Link from 'next/link';

export default function AppMenu() {
  return (
    <>
      <Link href={'/exercise'} className='card flex w-full'>
        <Image
          src={'/images/mental-health.svg'}
          width={40}
          height={40}
          alt='writing'
        />
        <div className='ml-2 flex flex-col'>
          <span className='text-primary text-[12px] font-bold'>
            Meet a Counselor
          </span>
          <span className='text-primary text-[10px]'>
            Let's consult your health to a certified professional
          </span>
        </div>
      </Link>

      <Link href={'/journal'} className='card flex w-full'>
        <Image
          src={'/images/writing.svg'}
          width={40}
          height={40}
          alt='writing'
        />
        <div className='ml-2 flex flex-col'>
          <span className='text-primary text-[12px] font-bold'>
            Start Writting
          </span>
          <span className='text-primary text-[10px]'>
            Express your current feelings
          </span>
        </div>
      </Link>
    </>
  );
}
