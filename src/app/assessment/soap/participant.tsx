import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger
} from '@/components/ui/drawer'
import { UserIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'

const participantList = [{ name: 'John Doe' }, { name: 'Fitra Agil' }]

export default function Participant({ participant, onChange }) {
  const [selectedTest, setSelectedTest] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  const handleSelectedTest = (index: number) => {
    const newTest = [...selectedTest]
    newTest[index] = !newTest[index]
    setSelectedTest(newTest)
  }

  return (
    <Drawer open={isOpen}>
      <DrawerTrigger className='flex' asChild>
        <div
          className='card mb-4 flex cursor-pointer items-center'
          onClick={() => setIsOpen(true)}
        >
          <UsersIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
          {participant}
        </div>
      </DrawerTrigger>
      <DrawerContent
        className='mx-auto max-w-screen-sm p-4'
        onInteractOutside={() => setIsOpen(false)}
      >
        {participantList.map((item, index) => (
          <div
            key={index}
            className='card my-4 flex cursor-pointer items-center justify-evenly border'
            onClick={() => {
              setIsOpen(false)
              onChange(item.name)
            }}
          >
            <div className='mr-2 h-[40px] w-[40px] rounded-full bg-[#F8F8F8] p-2'>
              <UserIcon />
            </div>
            <div className='mr-auto'>{item.name}</div>
          </div>
        ))}
        <DrawerClose>
          <Button
            variant='ghost'
            className='w-full rounded-xl bg-white p-4 text-[14px] text-secondary'
          >
            Close
          </Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  )
}
