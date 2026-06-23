import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import QRCode from 'react-qr-code';
import { toast } from 'react-toastify';

/**
 *
 */
export default function ModalQr({ value }) {
  const handleCopyToClipboard = () => {
    if (!value) return;

    navigator.clipboard
      .writeText(value)
      .then(() => {
        toast.success('URL copied to clipboard');
        // eslint-disable-next-line sonarjs/no-redundant-jump
        return;
      })
      .catch((err: unknown) => {
        console.error('Error copying to clipboard', err);
        toast.error('Error copying to clipboard');
      });
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className='bg-secondary rounded-xl text-white'>Show QR</Button>
      </DrawerTrigger>
      <DrawerContent
        onInteractOutside={handleCopyToClipboard}
        className='mx-auto max-w-screen-sm p-4'
      >
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
          viewBox={`0 0 256 256`}
        />
        <DrawerClose
          onClick={handleCopyToClipboard}
          className='border-secondary text-secondary rounded-xl border bg-white p-4 text-[14px]'
        >
          Close
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
