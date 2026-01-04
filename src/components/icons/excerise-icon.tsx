import React from 'react';

export default function ExceriseIcon(props: React.SVGProps<SVGSVGElement>) {
  const { fill = '#000000', width = 24, height = 24, strokeWidth = 1 } = props;

  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 25 25'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g clipPath='url(#clip0_6506_4994)'>
        <path
          d='M9.39218 23.5625H7.07487C6.23622 23.5625 5.5564 22.8827 5.5564 22.044V14.8776C5.5564 14.039 6.23622 13.3591 7.07487 13.3591H9.39218V23.5625Z'
          stroke={fill}
          strokeMiterlimit='10'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M5.55636 22.1714H3.25602C2.41738 22.1714 1.73755 21.4916 1.73755 20.653V16.2687C1.73755 15.4301 2.41738 14.7502 3.25602 14.7502H5.55636V22.1714Z'
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeMiterlimit='10'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M16.208 13.3592H18.5253C19.3639 13.3592 20.0438 14.039 20.0438 14.8776V22.0441C20.0438 22.8827 19.364 23.5625 18.5253 23.5625H16.208V13.3592Z'
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeMiterlimit='10'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M20.0438 14.7502H22.3442C23.1828 14.7502 23.8626 15.43 23.8626 16.2687V20.653C23.8626 21.4916 23.1828 22.1715 22.3442 22.1715H20.0438V14.7502Z'
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeMiterlimit='10'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M16.2079 16.3979H9.39209V20.5239H16.2079V16.3979Z'
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeMiterlimit='10'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M17.8988 6.40241C18.1527 5.81577 18.2506 5.2498 18.2506 4.61408C18.2506 2.56152 16.8201 1.4375 15.1938 1.4375C13.5948 1.4375 12.9876 2.45384 12.8035 2.87858C12.8024 2.87595 12.8012 2.87328 12.8001 2.87061C12.7989 2.87328 12.7977 2.87595 12.7966 2.87858C12.6125 2.45384 12.0053 1.4375 10.4063 1.4375C8.78007 1.4375 7.34949 2.56152 7.34949 4.61408C7.34949 5.44466 7.51664 6.15622 7.98066 6.95028C8.92618 8.56855 12.7964 10.603 12.7964 10.603C12.7964 10.603 12.7976 10.6022 12.8001 10.6006C12.8025 10.6022 12.8038 10.603 12.8038 10.603C12.8038 10.603 13.5613 10.2048 14.4878 9.62066'
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeMiterlimit='10'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </g>
      <defs>
        <clipPath id='clip0_6506_4994'>
          <rect
            width={width}
            height={height}
            fill='white'
            transform='translate(0.800049 0.5)'
          />
        </clipPath>
      </defs>
    </svg>
  );
}
