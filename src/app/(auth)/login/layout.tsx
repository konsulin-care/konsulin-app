import KonsulinLogo from '@/components/login/logo'

export default function LayoutLogin({ children }) {
  return (
    <div className='flex h-screen w-full flex-col items-center justify-between p-4'>
      <KonsulinLogo
        className='flex h-1/2 w-full flex-col items-center justify-end'
        width={276}
        height={205}
      />
      <div className='flex w-full items-center justify-center'>{children}</div>
    </div>
  )
}
