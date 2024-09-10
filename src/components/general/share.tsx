import { Share2Icon } from 'lucide-react'
import { ShareSocial } from 'react-share-social'
import { Drawer, DrawerContent, DrawerTrigger } from '../ui/drawer'

interface IShareProps {
  title?: string
}

export default function Share({ title = 'Share' }: IShareProps) {
  let currentLocation = window.location.href

  const style = {
    root: {
      width: '100%',
      color: 'white'
    },
    copyContainer: {
      width: '100%',
      border: '1px solid blue',
      background: 'rgb(0,0,0,0.7)'
    },
    title: {
      color: '#13c2c2',
      background: 'white'
    }
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <div className='h-[24px] w-min cursor-pointer rounded-[8px] bg-[#13C2C2] p-1'>
          <Share2Icon color='white' height={16} width={16} fill='white' />
        </div>
      </DrawerTrigger>
      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
        <div className='w-full'>
          {currentLocation && (
            <ShareSocial
              style={style}
              title={title}
              url={currentLocation}
              socialTypes={[
                'facebook',
                'twitter',
                'telegram',
                'line',
                'email'
                // 'whatsApp'
              ]}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
