import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { ChevronRightIcon } from 'lucide-react';
import { Fragment } from 'react';
import {
  ICON_MAP,
  type IconKey,
  useAccountAction
} from './hooks/useAccountAction';

/** Menu item row with optional icon, name label, and click handler. */
function MenuItem({
  name,
  icon,
  index,
  total,
  onClick
}: {
  readonly name: string;
  readonly icon?: IconKey;
  readonly index: number;
  readonly total: number;
  readonly onClick: () => void;
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const IconComponent = icon ? ICON_MAP[icon] : null;

  return (
    <li
      role='menuitem'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`flex cursor-pointer items-center justify-between py-4 ${
        !isFirst && !isLast ? 'border-b border-[#E8E8E8]' : ''
      } ${isFirst || isLast ? 'border-none' : 'border-t border-[#E8E8E8]'}`}
    >
      {IconComponent && <IconComponent size={24} className='text-[#13C2C2]' />}
      <p className='flex flex-grow justify-start pl-4 font-[#26282C] text-xs font-normal'>
        {name}
      </p>
      <ChevronRightIcon color='#ADB6C7' width={18} height={18} />
    </li>
  );
}

/** Confirmation drawer with title, subtitle, and confirm/cancel buttons. */
function ConfirmDrawerContent({
  title,
  subTitle,
  confirmText,
  onClose,
  onConfirm
}: {
  readonly title: string;
  readonly subTitle: string;
  readonly confirmText: string;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
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
            {confirmText}
          </span>
        </Button>
      </div>
    </DrawerContent>
  );
}

/** Profile actions menu with list of account actions and a confirmation drawer. */
export default function ProfileActions({
  menus
}: {
  readonly menus: readonly {
    readonly name: string;
    readonly link: string;
    readonly icon?: IconKey;
  }[];
}) {
  const {
    drawerState,
    confirmText,
    handleMenuClick,
    confirmAction,
    closeDrawer
  } = useAccountAction();

  return (
    <>
      <div className='mt-4 w-full rounded-lg bg-white'>
        <ul>
          {menus.map((item, index) => (
            <MenuItem
              key={item.name}
              name={item.name}
              icon={item.icon}
              index={index}
              total={menus.length}
              onClick={() => handleMenuClick(item.link)}
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
          confirmText={confirmText}
          onClose={closeDrawer}
          onConfirm={confirmAction}
        />
      </Drawer>
    </>
  );
}
