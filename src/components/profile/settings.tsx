import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { ChevronRightIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';

export default function Settings({ menus }) {
  const router = useRouter();
  const [drawerState, setDrawerState] = useState({
    title: '',
    subTitle: '',
    show: false
  });

  function handleClick(path: string) {
    if (path === '/logout') {
      setDrawerState({
        title: 'Apakah Anda Yakin Untuk Keluar Akun',
        subTitle:
          'Note that you need to login again in the\nfuture and the notification will not appears if you log out',
        show: true
      });
    } else if (path === '/remove-account') {
      setDrawerState({
        title: 'Apakah Anda Yakin Untuk Hapus Akun',
        subTitle:
          'Note that you cannot retrieve any data from\nthis account in the app if you delete your account.',
        show: true
      });
    } else {
      router.push(path);
    }
  }

  function confirmLogout() {
    setDrawerState(prevState => ({
      ...prevState,
      show: false
    }));

    router.push('/logout');
  }

  function closeDrawer() {
    setDrawerState(prevState => ({
      ...prevState,
      show: false
    }));
  }

  return (
    <>
      <div className='mt-4 w-full rounded-lg bg-white'>
        <ul>
          {menus.map((item: any, index: number) => {
            const isFirst = index === 0;
            const isLast = index === menus.length - 1;
            return (
              <div key={item.name} onClick={() => handleClick(item.link)}>
                <li
                  className={`flex cursor-pointer items-center justify-between py-4 ${
                    !isFirst && !isLast ? 'border-b border-[#E8E8E8]' : ''
                  } ${isFirst || isLast ? 'border-none' : 'border-t border-[#E8E8E8]'}`}
                >
                  <Image
                    src={'/icons/settings.svg'}
                    alt='setting-icons'
                    width={24}
                    height={24}
                  />
                  <p className='flex flex-grow justify-start pl-4 font-[#26282C] text-xs font-normal'>
                    {item.name}
                  </p>
                  <ChevronRightIcon color='#ADB6C7' width={18} height={18} />
                </li>
              </div>
            );
          })}
        </ul>
      </div>
      <Drawer open={drawerState.show} onClose={closeDrawer}>
        <DrawerTrigger asChild>
          <div />
        </DrawerTrigger>
        <DrawerContent className='mx-auto w-full max-w-screen-sm p-4'>
          <div className='rounded-t-lg bg-white'>
            <DrawerTitle className='text-black-100 py-1 text-center text-lg font-bold md:text-xl'>
              {drawerState.title.split('\n').map((line, index) => (
                <Fragment key={index}>
                  {line}
                  <br />
                </Fragment>
              ))}
            </DrawerTitle>
            <DrawerDescription className='text-center text-xs font-normal text-black opacity-60 md:text-sm'>
              {drawerState.subTitle.split('\n').map((line, index) => (
                <Fragment key={index}>
                  {line}
                  <br />
                </Fragment>
              ))}
            </DrawerDescription>
            <Button
              className='my-4 h-[52px] w-full rounded-full border-primary bg-secondary'
              type='button'
              onClick={closeDrawer}
            >
              <span className='text-sm font-bold text-white'>
                No, I don't want to
              </span>
            </Button>
            <Button
              className='mb-4 h-[52px] w-full rounded-full border border-[#2C2F35] border-opacity-20 bg-white text-sm font-bold'
              type='button'
              onClick={confirmLogout}
            >
              <span className='text-sm font-bold text-[#2C2F35]'>
                Yes, log me out
              </span>
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
