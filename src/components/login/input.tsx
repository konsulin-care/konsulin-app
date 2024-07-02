import Image from 'next/image'

export default function Input({
  outline,
  prefixIcon,
  suffixIcon = '',
  className,
  onShow = () => {},
  ...props
}) {
  return (
    <div className={className}>
      {prefixIcon && (
        <Image width={16} height={18} src={prefixIcon} alt='prefix-icon' />
      )}
      <input
        className={outline ? 'w-full' : 'w-full text-sm outline-none'}
        {...props}
      />
      {suffixIcon && (
        <button type='button' className='focus:outline-none' onClick={onShow}>
          <Image width={19} height={14} src={suffixIcon} alt='suffix-icon' />
        </button>
      )}
    </div>
  )
}
