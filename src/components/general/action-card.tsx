import Link from 'next/link';
import { ReactNode } from 'react';

interface ActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
}

/**
 *
 */
export default function ActionCard({
  icon,
  title,
  description,
  href
}: Readonly<ActionCardProps>) {
  return (
    <Link href={href} className='card flex w-full items-center gap-3 p-4'>
      <div className='flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]'>
        {icon}
      </div>
      <div className='flex flex-col'>
        <span className='text-primary text-[12px] font-bold'>{title}</span>
        <span className='text-primary text-[10px]'>{description}</span>
      </div>
    </Link>
  );
}
