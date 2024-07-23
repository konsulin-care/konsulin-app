import { cn } from '@/lib/utils'
import * as React from 'react'

export default function LoadingSpinner(props: React.SVGProps<SVGSVGElement>) {
  const {
    fill = 'none',
    stroke = '#13c2c2',
    width = 24,
    height = 24,
    className
  } = props

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={width}
      height={height}
      viewBox='0 0 24 24'
      fill={fill}
      stroke={stroke}
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={cn('animate-spin', className)}
    >
      <path d='M21 12a9 9 0 1 1-6.219-8.56' />
    </svg>
  )
}
