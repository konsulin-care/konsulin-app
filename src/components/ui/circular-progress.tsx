'use client';

import { cn } from '@/lib/utils';

interface CircularProgressProps {
  /** Completed fraction between 0 and 1. Values outside the range clamp. */
  value: number;
  /** Ring diameter in pixels. Defaults to 120. */
  size?: number;
  /** Ring stroke width in pixels. Defaults to 8. */
  strokeWidth?: number;
  /** Tailwind class forwarded to the outer wrapper. */
  className?: string;
}

/**
 * SVG circular progress ring: a gray background ring with a colored arc
 * marking the completed fraction, and the percentage centered in the middle.
 * Follows the LevelHalo ring pattern from the research contribution dashboard.
 *
 * @param value - Completed fraction 0-1 (clamped).
 * @param size - Ring diameter in pixels.
 * @param strokeWidth - Ring stroke width in pixels.
 * @param className - Tailwind class forwarded to the outer wrapper.
 * @returns A native <progress> plus a decorative ring SVG with a centered
 * percentage label.
 */
export default function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className
}: Readonly<CircularProgressProps>) {
  const clamped = Math.min(1, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.round(clamped * 100);

  return (
    <div className={cn('relative shrink-0', className)}>
      <progress
        aria-label='Questionnaire completion'
        max={100}
        value={percentage}
        className='sr-only'
      />
      <svg
        aria-hidden='true'
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className='shrink-0'
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke='#E5E7EB'
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          strokeLinecap='round'
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          // Palette-driven arc color; inline style because SVG stroke
          // attributes cannot resolve CSS custom properties.
          style={{ stroke: 'var(--secondary)' }}
        />
        <text
          x='50%'
          y='50%'
          dominantBaseline='central'
          textAnchor='middle'
          className='fill-current text-xl font-bold'
        >
          {percentage}%
        </text>
      </svg>
    </div>
  );
}
