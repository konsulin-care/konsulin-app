import Modal from '@/components/general/modal'
import { ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Settings({ menus }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState({
    title: '',
    subTitle: '',
    show: false
  })

  function handleClick(path: string) {
    if (path === '/logout') {
      setShowModal({
        title: 'Apakah Anda Yakin Untuk Keluar Akun',
        subTitle:
          'Note that you need to login again in the future and the notification will not appears if you log out',
        show: !showModal.show
      })
    } else if (path === '/remove-account') {
      setShowModal({
        title: 'Apakah Anda Yakin Untuk Hapus Akun',
        subTitle:
          'Note that you cannot retrieve any data from this account in the app if you delete your account.',
        show: !showModal.show
      })
    } else {
      router.push(path)
    }
  }

  function confirmLogout() {
    localStorage.clear()
    router.push('/login')
    setShowModal(prevShowModal => ({
      ...prevShowModal,
      show: false
    }))
  }

  function closeModal() {
    setShowModal(prevShowModal => ({
      ...prevShowModal,
      show: false
    }))
  }

  return (
    <>
      <div className={`w-full rounded-lg bg-white pt-4`}>
        <ul>
          {menus.map((item: any, index) => {
            const isFirst = index === 0
            const isLast = index === menus.length - 1
            return (
              <div key={item.name} onClick={() => handleClick(item.link)}>
                <li
                  className={`flex items-center justify-between py-4 ${
                    !isFirst && !isLast ? 'border-b border-[#E8E8E8]' : ''
                  } ${isFirst || isLast ? 'border-none' : 'border-t border-[#E8E8E8]'}`}
                >
                  <Image
                    src={'/icons/settings.svg'}
                    alt='setting-icons'
                    width={24}
                    height={24}
                  />
                  <p className='flex flex-grow justify-start pl-4 font-[#26282C] text-xs font-normal'>
                    {item.name}
                  </p>
                  <ChevronRightIcon color='#ADB6C7' width={18} height={18} />
                </li>
              </div>
            )
          })}
        </ul>
      </div>
      <Modal open={showModal.show} onClose={closeModal}>
        <div className='fixed inset-0 z-50 flex w-screen items-end justify-center bg-black bg-opacity-50'>
          <div className='w-full max-w-2xl rounded-t-lg bg-white px-4 py-8'>
            <p className='text-center text-xl font-bold'>{showModal.title}</p>
            <p className='pt-1 text-center text-sm text-black opacity-60'>
              {showModal.subTitle}
            </p>
            <button
              className='border-1 my-4 w-full rounded-full border-primary bg-secondary p-4 text-sm font-bold text-white'
              type='submit'
              onClick={closeModal}
            >
              No, i dont want to
            </button>
            <button
              className='rounded-fullbg-white w-full rounded-full border border-[#2C2F35] border-opacity-20 p-4 text-sm font-bold'
              type='submit'
              onClick={confirmLogout}
            >
              Yes, log me out
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
