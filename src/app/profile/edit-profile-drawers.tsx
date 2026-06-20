'use client';

import DobCalendar from '@/components/profile/dob-calendar';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { DRAWER_STATE, subtitle_success_updated } from '@/constants/profile';
import { Fragment } from 'react';

type Props = {
  readonly drawerState: string;
  readonly birthDate: string;
  readonly onDOBChange: (value: Date) => void;
  readonly onCloseDrawer: () => void;
  readonly onSuccessClose: () => void;
};

/* eslint-disable react/jsx-max-depth */
// skipcq: JS-0415 - nesting required by shadcn/ui Drawer component spec
/** Date of Birth and Success drawers for the edit profile page. */
export function EditProfileDrawers({
  drawerState,
  birthDate,
  onDOBChange,
  onCloseDrawer,
  onSuccessClose
}: Props) {
  if (drawerState === DRAWER_STATE.NONE) return null;

  return (
    <>
      <Drawer
        open={drawerState === DRAWER_STATE.DOB}
        onOpenChange={open => !open && onCloseDrawer()}
      >
        <DrawerTrigger asChild>
          <div />
        </DrawerTrigger>
        <DrawerContent className='mx-auto flex w-full max-w-screen-sm flex-col p-4'>
          <DrawerHeader>
            <DrawerTitle />
            <DrawerDescription />
          </DrawerHeader>
          <DobCalendar value={birthDate} onChange={onDOBChange} />
        </DrawerContent>
      </Drawer>

      <Drawer
        open={drawerState === DRAWER_STATE.SUCCESS}
        onOpenChange={open => {
          if (!open && drawerState === DRAWER_STATE.SUCCESS) {
            onSuccessClose();
          } else if (!open) {
            onCloseDrawer();
          }
        }}
      >
        <DrawerTrigger />
        <DrawerContent className='mx-auto flex w-full max-w-screen-sm flex-col'>
          <DrawerHeader>
            <DrawerTitle className='text-center text-xl font-bold text-[#2C2F35] opacity-100'>
              Changes Successful!
            </DrawerTitle>
            <DrawerDescription className='text-center text-sm text-[#2C2F35] opacity-60'>
              {subtitle_success_updated.split('\n').map(line => (
                <Fragment key={line}>
                  {line}
                  <br />
                </Fragment>
              ))}
            </DrawerDescription>
          </DrawerHeader>
          <button
            onClick={onSuccessClose}
            className='border-opacity-20 mx-4 mb-4 rounded-full border border-[#2C2F35] bg-white py-3 text-sm font-bold text-[#2C2F35] opacity-100'
          >
            Close
          </button>
        </DrawerContent>
      </Drawer>
    </>
  );
}
