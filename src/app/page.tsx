import Image from 'next/image'

export default function Home() {
  return (
    <div className='container flex flex-col items-center'>
      <div>
        <Image
          width={300}
          height={300}
          src={'/icons/konsulin-icon.png'}
          alt='home'
        />
      </div>
    </div>
  )
}
