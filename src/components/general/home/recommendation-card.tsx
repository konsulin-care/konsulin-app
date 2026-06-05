'use client';

import { Badge } from '@/components/ui/badge';
import { Recommendation } from '@/constants/recommendations';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface RecommendationCardProps {
  recommendation: Recommendation;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export default function RecommendationCard({
  recommendation,
  className,
  style,
  onClick
}: RecommendationCardProps) {
  const formattedFee = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(recommendation.fee);

  return (
    <div
      className={cn(
        'flex h-full w-full cursor-pointer flex-col rounded-2xl bg-white shadow-lg',
        className
      )}
      style={style}
      onClick={onClick}
    >
      <div className='relative flex h-[60%] min-h-0 w-full items-center justify-center overflow-hidden rounded-t-2xl'>
        {recommendation.photoUrl ? (
          <Image
            src={recommendation.photoUrl}
            alt={recommendation.name}
            fill
            className='object-cover'
            sizes='(max-width: 640px) 100vw, 400px'
          />
        ) : (
          <Image
            src='/images/provider-fallback.svg'
            alt={recommendation.name}
            fill
            className='object-cover'
            sizes='(max-width: 640px) 100vw, 400px'
          />
        )}
      </div>

      <div className='flex flex-1 flex-col justify-between p-4'>
        <div>
          <h3 className='text-[14px] leading-tight font-bold text-gray-900'>
            {recommendation.name}
          </h3>
          <p className='mt-0.5 text-[12px] text-gray-500'>
            {recommendation.serviceName}
          </p>

          {recommendation.specialties.length > 0 && (
            <div className='mt-2 flex flex-wrap gap-1'>
              {recommendation.specialties.map(s => (
                <Badge
                  key={s}
                  className='rounded-full bg-[#F0F0F0] px-2 py-0.5 text-[10px] font-normal text-gray-600 hover:bg-[#F0F0F0]'
                >
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className='mt-3 border-t border-gray-100 pt-3 text-center'>
          <span className='text-[16px] font-bold text-[#13C2C2]'>
            {formattedFee}
          </span>
        </div>
      </div>
    </div>
  );
}
