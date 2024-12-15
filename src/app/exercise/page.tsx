'use client'

import BackButton from '@/components/general/back-button'
import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import ExcerciseList from './excercise-list'

export default function Exercise() {
  return (
    <>
      <NavigationBar />
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <BackButton />

          <div className='text-[14px] font-bold text-white'>Self Excercise</div>
        </div>
      </Header>
      <ExcerciseList />
    </>
  )
}
