import AppDrawer from '@/components/ui/app-drawer';
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

/** Split multi-line text into <br/>-separated lines. */
function splitLines(text: string) {
  return text.split('\n').map(line => (
    <Fragment key={line}>
      {line}
      <br />
    </Fragment>
  ));
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
      <AppDrawer
        open={drawerState.show}
        onClose={closeDrawer}
        title={splitLines(drawerState.title)}
        description={splitLines(drawerState.subTitle)}
        ctaLabel={confirmText}
        onCtaClick={confirmAction}
      />
    </>
  );
}
