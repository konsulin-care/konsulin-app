import Image from 'next/image';

export default function Input({
  outline,
  prefixIcon,
  suffixIcon = '',
  className,
  width = 16,
  height = 18,
  backgroundColor = '[#FFFFFF]',
  opacity = true,
  onShow = () => {},
  ...props
}) {
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
      <input
        className={
          outline
            ? 'w-full'
            : `w-full text-sm font-normal text-[#2C2F35] ${
                opacity ? 'opacity-40' : undefined
              } outline-none placeholder:text-[#2C2F35]/60 bg-${backgroundColor}`
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
