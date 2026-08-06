'use client';

import DobCalendar from '@/components/profile/dob-calendar';
import AppDrawer from '@/components/ui/app-drawer';
import { DRAWER_STATE, subtitle_success_updated } from '@/constants/profile';
import { Fragment } from 'react';

type Props = {
  readonly drawerState: string;
  readonly birthDate: string;
  readonly onDOBChange: (value: Date | null) => void;
  readonly onCloseDrawer: () => void;
  readonly onSuccessClose: () => void;
};

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
      <AppDrawer
        open={drawerState === DRAWER_STATE.DOB}
        onClose={onCloseDrawer}
      >
        <DobCalendar
          value={birthDate ? new Date(birthDate) : null}
          onChange={onDOBChange}
        />
      </AppDrawer>

      <AppDrawer
        open={drawerState === DRAWER_STATE.SUCCESS}
        onClose={onSuccessClose}
        title={
          <span className='text-center text-xl font-bold text-[#2C2F35] opacity-100'>
            Changes Successful!
          </span>
        }
        description={
          <span className='text-center text-sm text-[#2C2F35] opacity-60'>
            {subtitle_success_updated.split('\n').map(line => (
              <Fragment key={line}>
                {line}
                <br />
              </Fragment>
            ))}
          </span>
        }
      />
    </>
  );
}
