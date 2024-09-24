import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger
} from '@/components/ui/drawer'
import QRCode from 'react-qr-code'

export default function ModalQr({ value }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className='rounded-xl bg-secondary text-white'>Show QR</Button>
      </DrawerTrigger>
      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
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
        <DrawerClose className='rounded-xl border border-secondary bg-white p-4 text-[14px] text-secondary'>
          Close
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  )
}
