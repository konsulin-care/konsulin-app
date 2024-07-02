import * as React from 'react'

export default function OfficeIcon(props: React.SVGProps<SVGSVGElement>) {
  const { fill = '#000000', width = 24, height = 24 } = props

  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 25 25'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g clip-path='url(#clip0_6506_8605)'>
        <mask
          id='mask0_6506_8605'
          maskUnits='userSpaceOnUse'
          x='0'
          y='0'
          width={width}
          height={height}
        >
          <path
            d='M0.202026 0.500002H24.202V24.5H0.202026V0.500002Z'
            fill='white'
          />
        </mask>
        <g mask='url(#mask0_6506_8605)'>
          <path
            d='M13.8895 23.5625C13.8895 21.1931 15.8104 19.25 18.1798 19.25H18.9743C21.3437 19.25 23.2645 21.1931 23.2645 23.5625'
            stroke={fill}
            stroke-miterlimit='10'
            stroke-linecap='round'
            stroke-linejoin='round'
          />
          <path
            d='M21.577 12.9219C21.577 14.6046 20.2129 15.9688 18.5302 15.9688C16.8474 15.9688 15.4833 14.6046 15.4833 12.9219C15.4833 11.2392 16.8474 9.875 18.5302 9.875C20.2129 9.875 21.577 11.2392 21.577 12.9219Z'
            stroke={fill}
            stroke-miterlimit='10'
            stroke-linecap='round'
            stroke-linejoin='round'
          />
          <path
            d='M19.1405 6.12402C19.1405 3.53572 17.0423 1.4375 14.454 1.4375H14.453H5.82609C3.23779 1.4375 1.13953 3.53572 1.13953 6.12402V18.8759C1.13953 21.4642 3.23779 23.5625 5.82609 23.5625H10.1395'
            stroke={fill}
            stroke-miterlimit='10'
            stroke-linecap='round'
            stroke-linejoin='round'
          />
        </g>
        <path d='M4.99988 7H14.9999' stroke={fill} stroke-linecap='round' />
        <path d='M4.99988 11H10.9999' stroke={fill} stroke-linecap='round' />
        <path d='M4.99988 15H10.9999' stroke={fill} stroke-linecap='round' />
        <path d='M4.99988 19H10.9999' stroke={fill} stroke-linecap='round' />
      </g>
      <defs>
        <clipPath id='clip0_6506_8605'>
          <rect
            width={width}
            height={height}
            fill='white'
            transform='translate(0.200073 0.5)'
          />
        </clipPath>
      </defs>
    </svg>
  )
}
