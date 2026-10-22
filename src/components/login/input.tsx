import Image from 'next/image';

/**
 *
 */
type InputProps = {
  outline?: boolean;
  prefixIcon?: string;
  suffixIcon?: string;
  className?: string;
  onShow?: () => void;
} & React.InputHTMLAttributes<HTMLInputElement>;

/** No-operation function for optional callback defaults. */
const noop = (): void => undefined;

/**
 *
 */
export default function Input({
  outline,
  prefixIcon,
  suffixIcon = '',
  className,
  onShow = noop,
  ...props
}: Readonly<InputProps>) {
  return (
    <div className={className}>
      {prefixIcon && (
        <Image width={16} height={18} src={prefixIcon} alt='prefix-icon' />
      )}
      <input
        className={
          outline
            ? 'w-full'
            : 'w-full text-sm font-normal text-[#2C2F35] opacity-40 outline-none placeholder:text-[#2C2F35]'
        }
        {...props}
      />
      {suffixIcon && (
        <button type='button' className='focus:outline-none' onClick={onShow}>
          <Image width={19} height={14} src={suffixIcon} alt='suffix-icon' />
        </button>
      )}
    </div>
  );
}
