import * as React from 'react'

export default function HouseIcon(props: React.SVGProps<SVGSVGElement>) {
  const { fill = '#000000', width = 24, height = 24 } = props

  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 25 25'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g clip-path='url(#clip0_6506_8591)'>
        <mask
          id='mask0_6506_8591'
          //   style='mask-type:luminance'
          maskUnits='userSpaceOnUse'
          x='0'
          y='0'
          width={width}
          height={height}
        >
          <path
            d='M0.401978 0.499025H24.402V24.499H0.401978V0.499025Z'
            fill={fill}
          />
        </mask>
        <g mask='url(#mask0_6506_8591)'>
          <path
            d='M21.6364 7.24902C22.7989 8.13571 23.4645 9.52424 23.4645 10.9863V18.874C23.4645 21.4629 21.3658 23.5615 18.777 23.5615H6.02698C3.43812 23.5615 1.33948 21.4629 1.33948 18.874V10.9863C1.33948 9.52424 2.0217 8.14584 3.18424 7.2592L9.55924 2.3969C11.2381 1.11641 13.5658 1.11641 15.2447 2.3969L18.777 5.0886V1.99902'
            stroke={fill}
            stroke-miterlimit='10'
            stroke-linecap='round'
            stroke-linejoin='round'
          />
          <path d='M7.99963 14H15.9996' stroke={fill} stroke-linecap='round' />
          <path d='M11.9996 18V10' stroke={fill} stroke-linecap='round' />
        </g>
      </g>
      <defs>
        <clipPath id='clip0_6506_8591'>
          <rect
            width={width}
            height={height}
            fill={fill}
            transform='translate(0.400024 0.5)'
          />
        </clipPath>
      </defs>
    </svg>
  )
}
