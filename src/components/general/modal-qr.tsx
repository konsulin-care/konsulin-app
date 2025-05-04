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

export default function ModalQr({ value }) {
  const handleCopyToClipboard = () => {
    if (!value) return;

    navigator.clipboard
      .writeText(value)
      .then(() => {
        toast.success('URL copied to clipboard');
      })
      .catch(err => {
        console.error('Error copying to clipboard', err);
        toast.error('Error copying to clipboard');
      });
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className='rounded-xl bg-secondary text-white'>Show QR</Button>
      </DrawerTrigger>
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
          viewBox={`0 0 256 256`}
        />
        <DrawerClose
          onClick={handleCopyToClipboard}
          className='rounded-xl border border-secondary bg-white p-4 text-[14px] text-secondary'
        >
          Close
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
