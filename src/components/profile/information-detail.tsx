import Image from 'next/image'
import Tags from './tags'

function HeaderSection({ isRadiusIcon, iconUrl, title, subTitle, role }) {
  const titleStyle =
    role === 'patient'
      ? 'text-sm font-bold opacity-100'
      : 'text-[10px] font-normal opacity-40'
  const subTitleStyle =
    role === 'patient'
      ? 'text-[10px] font-normal opacity-100'
      : 'text-sm font-bold opacity-100'

  return (
    <div className='flex w-1/2'>
      <Image
        src={iconUrl}
        width={32}
        height={32}
        alt='icon'
        className={`${isRadiusIcon ? 'rounded-full p-[2px]' : 'p-[2px]'}`}
      />
      <div className='flex flex-col items-start justify-start'>
        <p className={`pl-2 ${titleStyle}`}>{title}</p>
        {subTitle && <p className={`pl-2 ${subTitleStyle}`}>{subTitle}</p>}
      </div>
    </div>
  )
}

function DetailItem({ item }) {
  const isArray = Array.isArray(item.value)
  if (item.key === 'Specialty') {
    return (
      <div>
        <p className='text-left text-sm'>{item.key}</p>
        <div className='my-2 flex w-full border-t border-[#E3E3E3]' />
        {isArray && item.value.length > 0 && <Tags tags={item.value} />}
      </div>
    )
  }

  if (item.key === 'Educations') {
    const educations = JSON.parse(item.value)
    return (
      <>
        <p className='text-sm text-[#2C2F35] opacity-100'>{item.key}</p>
        <div className='flex flex-col items-end'>
          {educations &&
            educations.length > 0 &&
            educations.map((edu: string) => (
              <p
                key={edu}
                className='text-sm font-bold text-[#2C2F35] opacity-100'
              >
                {edu}
              </p>
            ))}
        </div>
      </>
    )
  }

  if (item.key === 'Practice Informations') {
    return null
  } else {
    return (
      <>
        <p className='text-sm text-[#2C2F35] opacity-100'>{item.key}</p>
        <p className='text-sm font-bold text-[#2C2F35] opacity-100'>
          {item.value}
        </p>
      </>
    )
  }
}

function DetailPratice({ item }) {
  const details = [
    { key: 'Clinic ID', value: item.clinic_id },
    { key: 'Clinic Name', value: item.clinic_name },
    { key: 'Affiliation', value: item.affiliation },
    {
      key: 'Price per Session',
      value: `${item.price_per_session.value.toLocaleString()} ${item.price_per_session.currency} / Session`
    }
  ]
  return (
    <div className='flex w-full flex-col py-2'>
      {details.map((detail, index) => (
        <div key={index} className='flex w-full justify-between'>
          <div className='text-sm text-[#2C2F35] opacity-100'>{detail.key}</div>
          <div className='text-sm font-bold text-[#2C2F35] opacity-100'>
            {detail.value}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function InformationDetail({
  isRadiusIcon = true,
  iconUrl,
  title,
  subTitle = '',
  buttonText,
  details,
  onEdit,
  role,
  isEditPratice = false
}) {
  return (
    <div className='flex w-full flex-col items-center justify-center rounded-[16px] border-0 bg-[#F9F9F9] p-4'>
      <div className='flex w-full items-center justify-between'>
        <HeaderSection
          isRadiusIcon={isRadiusIcon}
          iconUrl={iconUrl}
          title={title}
          subTitle={subTitle}
          role={role}
        />
        <div className='flex w-1/2 items-center justify-end'>
          <button onClick={onEdit}>
            <div className='w-[100px] rounded-full bg-secondary p-[7px]'>
              <p className='text-[10px] text-white'>{buttonText}</p>
            </div>
          </button>
        </div>
      </div>
      {details && <div className='flex w-full' />}
      <div
        className={`flex w-full flex-col ${details ? 'mt-2 space-y-2 border-t border-[#E3E3E3]' : undefined}`}
      >
        {details &&
          details.map((item: any) => (
            <div
              className='mt-1 flex justify-between font-[#2C2F35] text-xs'
              key={item.key}
            >
              {isEditPratice ? (
                <DetailPratice item={item} />
              ) : (
                <DetailItem item={item} />
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
