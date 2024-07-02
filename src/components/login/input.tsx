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
        <Image width={24} height={24} src={prefixIcon} alt='prefix-icon' />
      )}
      <input
        className={outline ? 'w-full' : 'w-full outline-none'}
        {...props}
      />
      {suffixIcon && (
        <button type='button' className='focus:outline-none' onClick={onShow}>
          <Image width={24} height={24} src={suffixIcon} alt='suffix-icon' />
        </button>
      )}
    </div>
  )
}
