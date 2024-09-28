import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger
} from '@/components/ui/drawer'
import { SquareCheckIcon, SquareIcon } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

const testItems = [
  { name: 'BIG 5 Personality Test' },
  { name: 'BIG 4 Personality Test' },
  { name: 'BIG 3 Personality Test' }
]

export default function ObjectiveFindingModal() {
  const [selectedTest, setSelectedTest] = useState([])

  const handleSelectedTest = (index: number) => {
    const newTest = [...selectedTest]
    newTest[index] = !newTest[index]
    setSelectedTest(newTest)
  }
  return (
    <Drawer>
      <DrawerTrigger className='flex' asChild>
        <Button className='rounded-xl bg-secondary text-[14px] text-white'>
          Add Test
        </Button>
      </DrawerTrigger>
      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
        {testItems.map((item, index) => (
          <div
            key={index}
            className='card my-4 flex items-center justify-evenly border'
          >
            <div className='mr-2 h-[40px] w-[40px] rounded-full bg-[#F8F8F8] p-2'>
              <Image
                className='h-[24px] w-[24px] object-cover'
                src={'/images/note.svg'}
                width={24}
                height={24}
                alt='note'
              />
            </div>
            <div className='mr-auto'>{item.name}</div>
            <div onClick={() => handleSelectedTest(index)}>
              {selectedTest[index] ? (
                <SquareCheckIcon fill='#13c2c2' color='white' />
              ) : (
                <SquareIcon color='hsla(240,6%,83%,1)' />
              )}
            </div>
          </div>
        ))}
        <DrawerClose>
          <Button className='w-full rounded-xl bg-secondary p-4 text-[14px] text-white'>
            Save Test
          </Button>
          <Button className='w-full rounded-xl bg-white p-4 text-[14px] text-secondary'>
            Close
          </Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  )
}
