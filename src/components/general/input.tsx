import Image from 'next/image';

/**
 *
 */
type InputProps = {
  outline?: boolean;
  prefixIcon?: string;
  suffixIcon?: string;
  className?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  opacity?: boolean;
  onShow?: () => void;
} & React.InputHTMLAttributes<HTMLInputElement>;

const noop = (): void => undefined;

/**
 *
 */
export default function Input({
  outline,
  prefixIcon,
  suffixIcon = '',
  className,
  width = 16,
  height = 18,
  backgroundColor = '[#FFFFFF]',
  opacity = true,
  onShow = noop,
  ...props
}: Readonly<InputProps>) {
  const opacityClass = opacity ? 'opacity-40' : '';
  const inputClassName = outline
    ? 'w-full'
    : `w-full text-sm font-normal text-[#2C2F35] ${opacityClass} outline-none placeholder:text-[#2C2F35]/60 bg-${backgroundColor}`;

  return (
    <div className={className}>
      {prefixIcon && (
        <Image
          width={width}
          height={height}
          src={prefixIcon}
          alt='prefix-icon'
        />
      )}
      <input className={inputClassName} {...props} />
      {suffixIcon && (
        <button type='button' className='focus:outline-none' onClick={onShow}>
          <Image width={19} height={14} src={suffixIcon} alt='suffix-icon' />
        </button>
      )}
    </div>
  );
}
