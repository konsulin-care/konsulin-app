import { IPractitionerRoleDetail } from '@/types/practitioner';
import Avatar from '../general/avatar';
import Tags from './tags';

function HeaderSection({
  isRadiusIcon,
  iconUrl,
  title,
  subTitle,
  role,
  initials,
  backgroundColor
}) {
  const titleStyle =
    role === 'patient'
      ? 'text-sm font-bold opacity-100'
      : 'text-[10px] font-normal opacity-40';
  const subTitleStyle =
    role === 'patient'
      ? 'text-[10px] font-normal opacity-100 truncate overflow-hidden whitespace-nowrap'
      : 'text-left whitespace-nowrap text-sm font-bold opacity-100 overflow-hidden break-words';

  return (
    <div className='flex w-1/2 items-center'>
      <Avatar
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
function DetailItem({ item }) {
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
 * Renders practice information (affiliation and fee) and an optional list of specialties.
 *
 * Renders two labeled detail rows: "Affiliation" (organization name or `-`) and "Fee" (formatted Indonesian currency per session or `-`). If `items.specialty` is an array of objects with a `text` field, renders those texts as tags.
 *
 * @param items - Practice data; expected shape includes:
 *   - organizationData.name (string | undefined)
 *   - invoiceData.totalNet { value: number, currency: string } (optional)
 *   - specialty: Array<{ text: string }> (optional)
 * @returns A JSX fragment containing the practice detail rows and, when present, a Tags component for specialties.
 */
function DetailPractice({ items }) {
  const organizationName =
    items && items.organizationData.name ? items.organizationData.name : '-';

  const fee =
    items && items.invoiceData?.totalNet
      ? `${new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: items.invoiceData.totalNet.currency,
          minimumFractionDigits: 0
        }).format(items.invoiceData.totalNet.value)} / Session`
      : '-';

  const practiceInformationsDetail = [
    {
      key: 'Affiliation',
      value: organizationName
    },
    {
      key: 'Fee',
      value: fee
    }
  ];

  const specialties = Array.isArray(items?.specialty)
    ? items.specialty.map((item: { text: string }) => item.text).filter(Boolean)
    : null;

  return (
    <>
      <div className='flex w-full flex-col py-2'>
        {practiceInformationsDetail.map((item, index) => {
          return (
            <div key={index} className='mt-2 flex w-full justify-between'>
              <div className='text-sm text-[#2C2F35] opacity-100'>
                {item.key}
              </div>
              <div className='text-sm font-bold text-[#2C2F35] opacity-100'>
                {item.value}
              </div>
            </div>
          );
        })}
      </div>

      {specialties && Array.isArray(specialties) && (
        <div className='my-2 flex w-full'>
          <Tags tags={specialties} />
        </div>
      )}
    </>
  );
}

/**
 * Renders a rounded information card with an avatar header, an action button, and a list of detail rows or practice sections.
 *
 * Renders a HeaderSection with avatar/title/subtitle and a right-aligned action button. When `isEditPractice` is true, `details` is treated as an array of practice objects and each entry is rendered using DetailPractice; otherwise `details` is treated as a list of key/value items and each entry is rendered using DetailItem.
 *
 * @param isRadiusIcon - Whether the avatar uses a rounded icon style (default: `true`).
 * @param iconUrl - URL of the avatar image to display.
 * @param title - Primary title text shown next to the avatar.
 * @param subTitle - Secondary text shown under the title (default: empty string).
 * @param buttonText - Label for the action button displayed in the header.
 * @param details - Array of detail entries; structure depends on `isEditPractice` (practice objects when `true`, key/value items when `false`).
 * @param onEdit - Click handler invoked when the action button is pressed.
 * @param role - Role used to adjust header typography and layout (affects HeaderSection rendering).
 * @param isEditPractice - When `true`, render practice-style detail sections; when `false`, render simple key/value detail rows (default: `false`).
 * @param initials - Initials to show in the avatar when no image URL is provided.
 * @param backgroundColor - Background color for the avatar.
 * @returns The React element for the information card.
 */
export default function InformationDetail({
  isRadiusIcon = true,
  iconUrl,
  title,
  subTitle = '',
  buttonText,
  details,
  onEdit,
  role,
  isEditPractice = false,
  initials,
  backgroundColor
}) {
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
        />
        <div className='flex w-1/2 items-start justify-end'>
          <button onClick={onEdit}>
            <div className='bg-secondary w-[100px] rounded-full p-[7px]'>
              <p className='text-[10px] text-white'>{buttonText}</p>
            </div>
          </button>
        </div>
      </div>

      {details && <div className='flex w-full' />}

      {isEditPractice ? (
        <div className='mt-2 flex w-full flex-col'>
          {Array.isArray(details) &&
            details.map((detail, index) => (
              <div
                key={index}
                className='mt-1 flex flex-col border-t border-[#E3E3E3] font-[#2C2F35] text-xs'
              >
                <DetailPractice items={detail} />
              </div>
            ))}
        </div>
      ) : (
        <div className='mt-2 flex w-full flex-col space-y-2 border-t border-[#E3E3E3]'>
          {details?.map((item: IPractitionerRoleDetail, index: number) => (
            <div
              className='mt-2 flex justify-between font-[#2C2F35] text-xs'
              key={index}
            >
              <DetailItem item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}