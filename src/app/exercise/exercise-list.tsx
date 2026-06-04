import BackButton from '@/components/general/back-button';
import Header from '@/components/header';
import NavigationBar from '@/components/navigation-bar';
import ExcerciseListContent from './excercise-list';

export default function ExerciseList() {
  return (
    <>
      <NavigationBar />
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <BackButton route='/' />

          <div className='text-[14px] font-bold text-white'>Self Excercise</div>
        </div>
      </Header>
      <ExcerciseListContent />
    </>
  );
}
