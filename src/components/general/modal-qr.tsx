import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { useTranslations } from '@/i18n';
import { writeClipboard } from '@/utils/clipboard';
import QRCode from 'react-qr-code';
import { toast } from 'react-toastify';

type Props = {
  readonly value: string;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
};

/** QR modal displaying a `value` prop as QR code content. */
export default function ModalQr({ value, open, onOpenChange }: Props) {
  const t = useTranslations('common');
  const tToast = useTranslations('toast');

  /** Copy link to clipboard and close the drawer. */
  const handleCopyLink = () => {
    writeClipboard(value)
      .then(() => toast.success(tToast('qr_copy_success')))
      .catch((err: unknown) => {
        console.error('Error copying to clipboard', err);
        toast.error(tToast('qr_copy_error'));
      });

    onOpenChange?.(false);
  };

  const isControlled = open !== undefined;

  const drawerContent = (
    <DrawerContent className='mx-auto max-w-screen-sm p-4'>
      <DrawerTitle />
      <DrawerDescription />
      <QRCode
        size={150}
        style={{
          height: '290px',
          maxWidth: '100%',
          width: '100%',
          margin: '32px 0'
        }}
        value={value}
        viewBox='0 0 256 256'
      />
      <DrawerFooter>
        <Button
          variant='secondary'
          className='text-white'
          onClick={handleCopyLink}
        >
          {t('qr.copy_link')}
        </Button>
      </DrawerFooter>
    </DrawerContent>
  );

  if (isControlled) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className='bg-secondary rounded-xl text-white'>
          {t('qr.show')}
        </Button>
      </DrawerTrigger>
      {drawerContent}
    </Drawer>
  );
}
