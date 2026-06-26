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

/** A single settings menu item — icon, name, and chevron. */
function MenuItem({
  name,
  index,
  total,
  onClick
}: {
  name: string;
  index: number;
  total: number;
  onClick: () => void;
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return (
    <div onClick={onClick}>
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
          {name}
        </p>
        <ChevronRightIcon color='#ADB6C7' width={18} height={18} />
      </li>
    </div>
  );
}

/** Confirmation drawer content with title, description, and action buttons. */
function ConfirmDrawerContent({
  title,
  subTitle,
  onClose,
  onConfirm
}: {
  title: string;
  subTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <DrawerContent className='mx-auto w-full max-w-screen-sm p-4'>
      <div className='rounded-t-lg bg-white'>
        <DrawerTitle className='text-black-100 py-1 text-center text-lg font-bold md:text-xl'>
          {title.split('\n').map(line => (
            <Fragment key={line}>
              {line}
              <br />
            </Fragment>
          ))}
        </DrawerTitle>
        <DrawerDescription className='text-center text-xs font-normal text-black opacity-60 md:text-sm'>
          {subTitle.split('\n').map(line => (
            <Fragment key={line}>
              {line}
              <br />
            </Fragment>
          ))}
        </DrawerDescription>
        <Button
          className='border-primary bg-secondary my-4 h-[52px] w-full rounded-full'
          type='button'
          onClick={onClose}
        >
          <span className='text-sm font-bold text-white'>
            No, I don&apos;t want to
          </span>
        </Button>
        <Button
          className='border-opacity-20 mb-4 h-[52px] w-full rounded-full border border-[#2C2F35] bg-white text-sm font-bold'
          type='button'
          onClick={onConfirm}
        >
          <span className='text-sm font-bold text-[#2C2F35]'>
            Yes, log me out
          </span>
        </Button>
      </div>
    </DrawerContent>
  );
}

/**
 * Settings page with list menu and a confirmation drawer for logout/delete.
 */
export default function Settings({
  menus
}: {
  readonly menus: readonly { readonly name: string; readonly link: string }[];
}) {
  const router = useRouter();
  const [drawerState, setDrawerState] = useState({
    title: '',
    subTitle: '',
    show: false
  });

  /** Navigate to the given path and close the drawer. */
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

  /** Execute logout, clear redirect, and navigate to login page. */
  function confirmLogout() {
    setDrawerState(prevState => ({
      ...prevState,
      show: false
    }));

    router.push('/logout');
  }

  /** Close the logout confirmation drawer. */
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
          {menus.map((item, index) => (
            <MenuItem
              key={item.name}
              name={item.name}
              index={index}
              total={menus.length}
              onClick={() => handleClick(item.link)}
            />
          ))}
        </ul>
      </div>
      <Drawer open={drawerState.show} onClose={closeDrawer}>
        <DrawerTrigger asChild>
          <div />
        </DrawerTrigger>
        <ConfirmDrawerContent
          title={drawerState.title}
          subTitle={drawerState.subTitle}
          onClose={closeDrawer}
          onConfirm={confirmLogout}
        />
      </Drawer>
    </>
  );
}
