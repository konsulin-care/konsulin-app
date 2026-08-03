import { Roles } from '@/constants/roles';

import Avatar from '../general/avatar';

/** Renders the profile header with avatar, title, and action button. */
function HeaderSection({
  isRadiusIcon,
  iconUrl,
  title,
  subTitle,
  role,
  initials,
  backgroundColor,
  seed
}: {
  readonly isRadiusIcon?: boolean;
  readonly iconUrl?: string;
  readonly title?: string;
  readonly subTitle?: string;
  readonly role?: string;
  readonly initials: string;
  readonly backgroundColor: string;
  readonly seed?: string;
}) {
  const titleStyle =
    role === Roles.Patient
      ? 'text-sm font-bold opacity-100'
      : 'text-[10px] font-normal opacity-40';
  const subTitleStyle =
    role === Roles.Patient
      ? 'text-[10px] font-normal opacity-100 truncate overflow-hidden whitespace-nowrap'
      : 'text-left whitespace-nowrap text-sm font-bold opacity-100 overflow-hidden break-words';

  return (
    <div className='flex w-1/2 items-center'>
      <Avatar
        seed={seed}
        initials={initials}
        backgroundColor={backgroundColor}
        photoUrl={iconUrl}
        className='mr-2 flex-shrink-0 text-xs'
        imageClassName='p-[2px]'
        height={32}
        width={32}
        isRadiusIcon={isRadiusIcon}
      />
      <div className='flex w-full flex-col items-start justify-start pl-1'>
        <p className={titleStyle}>{title}</p>
        {subTitle && <p className={`${subTitleStyle}`}>{subTitle}</p>}
      </div>
    </div>
  );
}

/**
 * Renders a two-line detail row with a left-aligned label and a right-aligned bold value.
 *
 * @param item - Object containing `key` (label text) and `value` (display value) to render
 * @returns A JSX element with two paragraph elements: the label on the left and the bold value on the right
 */
function DetailItem({
  item
}: {
  readonly item: { readonly key: string; readonly value: string };
}) {
  return (
    <>
      <p className='text-left text-sm text-[#2C2F35] opacity-100'>{item.key}</p>
      <p className='text-right text-sm font-bold text-[#2C2F35] opacity-100'>
        {item.value}
      </p>
    </>
  );
}

/**
 * Renders a rounded information card with an avatar header, an action button, and a list of detail rows.
 *
 * Renders a HeaderSection with avatar/title/subtitle and a right-aligned action button. `details` is treated as a list of key/value items and each entry is rendered using DetailItem.
 *
 * @param isRadiusIcon - Whether the avatar uses a rounded icon style (default: `true`).
 * @param iconUrl - URL of the avatar image to display.
 * @param title - Primary title text shown next to the avatar.
 * @param subTitle - Secondary text shown under the title (default: empty string).
 * @param buttonText - Label for the action button displayed in the header.
 * @param details - Array of key/value detail items to render.
 * @param onEdit - Click handler invoked when the action button is pressed.
 * @param role - Role used to adjust header typography and layout (affects HeaderSection rendering).
 * @param initials - Initials to show in the avatar when no image URL is provided.
 * @param backgroundColor - Background color for the avatar.
 * @returns The React element for the information card.
 */
/** Action button section with rounded pill style. */
const DetailActionButton = ({
  onEdit,
  buttonText
}: {
  onEdit?: () => void;
  buttonText?: string;
}) => (
  <div className='flex w-1/2 items-start justify-end'>
    <button
      onClick={onEdit}
      className='cursor-pointer transition-all duration-200 hover:brightness-90'
    >
      <div className='bg-secondary w-[100px] rounded-full p-[7px]'>
        <p className='text-[10px] text-white'>{buttonText}</p>
      </div>
    </button>
  </div>
);

/** Displays a profile information card with header, details, and edit action. */
export default function InformationDetail({
  isRadiusIcon = true,
  iconUrl,
  title,
  subTitle = '',
  buttonText,
  details,
  onEdit,
  role,
  initials,
  backgroundColor,
  seed
}: Readonly<{
  isRadiusIcon?: boolean;
  iconUrl?: string;
  title?: string;
  subTitle?: string;
  buttonText?: string;
  details?: unknown[];
  onEdit?: () => void;
  role?: string;
  initials: string;
  backgroundColor: string;
  seed?: string;
}>) {
  return (
    <div className='flex w-full flex-col items-center justify-center rounded-[16px] border-0 bg-[#F9F9F9] p-4'>
      <div className='flex w-full items-start justify-between'>
        <HeaderSection
          isRadiusIcon={isRadiusIcon}
          iconUrl={iconUrl}
          title={title}
          subTitle={subTitle}
          role={role}
          initials={initials}
          backgroundColor={backgroundColor}
          seed={seed}
        />
        <DetailActionButton onEdit={onEdit} buttonText={buttonText} />
      </div>

      {details && <div className='flex w-full' />}

      <div className='mt-2 flex w-full flex-col space-y-2 border-t border-[#E3E3E3]'>
        {details?.map((item: { id: string; key: string; value: string }) => (
          <div
            className='mt-2 flex justify-between font-[#2C2F35] text-xs'
            key={item.id}
          >
            <DetailItem item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
