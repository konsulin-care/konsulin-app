export default function OnBoardingPage({ title, onClick }) {
  return (
    <div
      className={
        'flex h-1/2 w-full flex-col items-center justify-end space-y-4 pb-4 md:w-96'
      }
    >
      <p className='text-xl font-semibold capitalize text-secondary'>{title}</p>
      <button
        onClick={() => onClick('patient')}
        className={
          'text-md mt-20 w-full rounded-full bg-secondary p-4 capitalize text-white'
        }
      >
        Login Sebagai Pasien
      </button>
      <button
        onClick={() => onClick('clinician')}
        className='text-md mt-20 w-full rounded-full border bg-white p-4 capitalize text-secondary'
      >
        Login Sebagai Clinician
      </button>
    </div>
  )
}
