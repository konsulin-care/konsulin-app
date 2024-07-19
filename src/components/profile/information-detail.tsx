import Image from 'next/image'
import Tags from './tags'

export default function InformationDetail({
  isRadiusIcon = true,
  iconUrl,
  title,
  subTitle = '',
  buttonText,
  details,
  onEdit,
  role
}) {
  return (
    <div className='flex w-full flex-col items-center justify-center bg-[#F9F9F9] p-4'>
      <div className='flex w-full justify-between pb-2'>
        <div className='flex w-1/2'>
          <Image
            src={iconUrl}
            width={32}
            height={32}
            alt='sample-foto'
            className={`${isRadiusIcon ? 'rounded-full p-[2px]' : 'p-[2px]'}`}
          />
          <div className='flex flex-col items-start justify-start'>
            {role === 'patient' && (
              <>
                <p className='pl-2 text-sm font-bold text-[#2C2F35] opacity-100'>
                  {title}
                </p>
                {subTitle && (
                  <p className='pl-2 text-[10px] font-normal text-[#2C2F35] opacity-100'>
                    {subTitle}
                  </p>
                )}
              </>
            )}
            {role === 'clinician' && (
              <>
                <p className='pl-2 text-[10px] font-normal text-[#2C2F35] opacity-40'>
                  {title}
                </p>
                {subTitle && (
                  <p className='pl-2 text-sm font-bold text-[#2C2F35] opacity-100'>
                    {subTitle}
                  </p>
                )}
              </>
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
      <div className='flex w-full border-t border-[#E3E3E3] pb-2' />
      <div className='flex w-full flex-col space-y-2'>
        {details.map((item: any) => {
          return (
            <div
              className='flex justify-between font-[#2C2F35] text-xs'
              key={item.key}
            >
              {item.key === 'Specialty' ? (
                <div>
                  <p className='text-left text-sm'>{item.key}</p>
                  <div className='mt-2 flex w-full border-t border-[#E3E3E3]' />
                  {item.value.length > 0 && <Tags tags={item.value} />}
                </div>
              ) : (
                <>
                  <p className='text-sm text-[#2C2F35] opacity-100'>
                    {item.key}
                  </p>
                  <p className='text-sm font-bold text-[#2C2F35] opacity-100'>
                    {item.value}
                  </p>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
