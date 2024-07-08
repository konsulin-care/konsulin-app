import Image from 'next/image'
import Tags from './tags'

export default function InformationDetail({
  isRadiusIcon = true,
  iconUrl,
  title,
  subTitle = '',
  buttonText,
  details,
  onEdit
}) {

  return (
    <div className='flex w-full flex-col items-center justify-center px-4 pb-4'>
      <div className='flex w-full justify-between pb-2 pt-4'>
        <div className='flex w-1/2'>
          <Image
            src={iconUrl}
            width={32}
            height={32}
            alt='sample-foto'
            className={`${isRadiusIcon ? 'rounded-full p-[2px]' : 'p-[2px]'}`}
          />
          <div className='flex flex-col items-start justify-start'>
            <p className='text-black-40 px-2 text-[10px]'>{title}</p>
            {subTitle && (
              <p className='px-2 text-sm font-bold text-[#2C2F35]'>
                {subTitle}
              </p>
            )}
          </div>
        </div>
        <div className='flex w-1/2 items-center justify-end'>
          <button onClick={onEdit}>
            <div className='w-[100px] rounded-full bg-secondary p-[7px]'>
              <p className='text-[10px] text-white'>{buttonText}</p>
            </div>
          </button>
        </div>
      </div>
      <div className='flex w-full border-t border-[#E3E3E3]' />
      <div className='flex w-full flex-col space-y-2 py-2'>
        {details.map((item: any) => {
          return (
            <div
              className='flex justify-between font-[#2C2F35] text-xs'
              key={item.key}
            >
              {item.key === 'Specialty' ? (
                <div>
                  <p className='text-left'>{item.key}</p>
                  <div className='mt-2 flex w-full border-t border-[#E3E3E3]' />
                  {item.value.length > 0 && <Tags tags={item.value} />}
                </div>
              ) : (
                <>
                  <p>{item.key}</p>
                  <p className='font-bold'>{item.value}</p>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
