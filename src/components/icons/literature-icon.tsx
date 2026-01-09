import * as React from 'react';

export default function LiteratureIcon(props: React.SVGProps<SVGSVGElement>) {
  const { fill = '#000000', width = 24, height = 24, strokeWidth = 1 } = props;

  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 24 25'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g clipPath='url(#clip0_6506_8626)'>
        <path
          d='M19.3126 1.4375C18.277 1.4375 17.4376 2.27698 17.4376 3.3125V20.75C17.4376 22.3033 16.1784 23.5625 14.6251 23.5625C13.0718 23.5625 11.8126 22.3033 11.8126 20.75C11.8126 20.1079 12.0278 19.516 12.39 19.0426L12.3601 19.0824C12.6046 18.7657 12.7501 18.3686 12.7501 17.9375C12.7501 16.902 11.9106 16.0625 10.8751 16.0625H4.68756C2.61648 16.0625 0.937561 17.7414 0.937561 19.8125C0.937561 21.8836 2.61648 23.5625 4.68756 23.5625H14.6251'
          stroke={fill}
          strokeMiterlimit='10'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M4.68756 12.6875V3.3125C4.68756 2.27698 5.52705 1.4375 6.56256 1.4375H19.0869C21.0736 1.4375 22.8818 2.88237 23.0488 4.86205C23.1772 6.38445 22.3952 7.73722 21.1876 8.4358'
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeMiterlimit='10'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M8.43756 5.1875H13.6876'
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeMiterlimit='10'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M8.43756 8.9375H13.6876'
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeMiterlimit='10'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M8.43756 12.6875H13.6876'
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeMiterlimit='10'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </g>
      <defs>
        <clipPath id='clip0_6506_8626'>
          <rect
            width={width}
            height={height}
            fill='white'
            transform='translate(0 0.5)'
          />
        </clipPath>
      </defs>
    </svg>
  );
}
