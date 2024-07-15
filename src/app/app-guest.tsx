import HomeMenuClinicianGuest from './app-menu-clinician-guest'
import Community from './community'
import PopularAssesment from './popular-assesment'

export default function AppGuest() {
  return (
    <div className='mt-[-24px] rounded-[16px] bg-white'>
      <div className='flex gap-4 p-4'>
        <HomeMenuClinicianGuest />
      </div>

      <PopularAssesment />

      <div className='p-4'>
        <Community />
      </div>
    </div>
  )
}
