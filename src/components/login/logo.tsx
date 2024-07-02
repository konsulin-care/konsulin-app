import Image from 'next/image'

export default function KonsulinLogo({ width = 276, height = 205, className }) {
  return (
    <div className={className}>
      <Image
        src={'/icons/konsulin-icon.png'}
        width={width}
        height={height}
        alt='konsulin-logo'
      />
    </div>
  )
}
