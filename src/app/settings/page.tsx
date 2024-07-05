'use client'

import { Switch } from '@/components/ui/switch'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const settingLists = [
  {
    id: 'ubah-password',
    iconUrl: '/icons/lock-setting.svg',
    label: 'Ubah Password',
    link: '/'
  },
  {
    id: 'faq',
    iconUrl: '/icons/popup-chat.svg',
    label: 'FAQ',
    link: '/'
  },
  {
    id: 'penilaian',
    iconUrl: '/icons/thumb-up.svg',
    label: 'Penilaian',
    link: '/'
  },
  {
    id: 'localization',
    iconUrl: '/icons/world.svg',
    label: 'Pengaturan Bahasa',
    link: '/'
  },
  {
    id: 'notification',
    iconUrl: '/icons/bell-setting.svg',
    label: 'Pengaturan Notifikasi',
    link: '/'
  },
  {
    id: 'session-reminder',
    iconUrl: '',
    label: 'Session Reminder'
  },
  {
    id: 'news-updates',
    iconUrl: '',
    label: 'News & Updates'
  },
  {
    id: 'term-and-condition',
    iconUrl: '/icons/note.svg',
    label: 'Syarat & Ketentuan',
    link: '/'
  },
  {
    id: 'information-app',
    iconUrl: '/icons/info.svg',
    label: 'Informasi Aplikasi',
    desc: 'Versi 1.1',
    link: '/'
  }
]

export default function Settings() {
  const [sessionEnabled, setSessionEnabled] = useState(false)
  const [newUpdatesEnabled, setNewUpdateEnabled] = useState(false)

  function handleChangeSwitch(menu: string, checked: boolean) {
    if (menu === 'Session Reminder') {
      console.log(`Session Reminder ${checked}`)
      setSessionEnabled(checked)
    } else if (menu === 'News & Updates') {
      console.log(`News & Updates ${checked}`)
      setNewUpdateEnabled(checked)
    }
  }

  return (
    <div className='mt-[-24px] rounded-[16px] bg-white'>
      <div className='px-4 py-8'>
        <div className='rounded-lg bg-[#F9F9F9]'>
          <p className='text-xs text-black opacity-50'>Pengaturan</p>
          <ul>
            {settingLists.map((menu, index) => {
              const isLastItem = index === settingLists.length - 1
              return (
                <li
                  className={`flex items-center justify-between ${isLastItem ? '' : 'border-b border-[#E8E8E8]'} space-y-4`}
                  key={menu.id}
                >
                  <div
                    className={`flex flex-grow items-center ${menu.iconUrl ? 'p-[11px]' : ''}`}
                  >
                    {menu.iconUrl && (
                      <Image
                        src={menu.iconUrl}
                        width={24}
                        height={24}
                        alt={`${menu.label}-icon`}
                      />
                    )}
                    <div className={menu.desc ? 'flex flex-col' : ''}>
                      <p className='text-black-100 px-4 text-xs font-normal'>
                        {menu.label}
                      </p>
                      {menu.desc && (
                        <p className='px-4 text-[10px] font-normal text-[#2C2F35] opacity-60'>
                          {menu.desc}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className='flex items-start pb-4'>
                    {menu.iconUrl ? (
                      <Link href={menu.link}>
                        <ChevronRight color='#ADB6C7' width={24} height={24} />
                      </Link>
                    ) : (
                      <Switch
                        checked={
                          menu.label === 'Session Reminder'
                            ? sessionEnabled
                            : newUpdatesEnabled
                        }
                        onCheckedChange={checked =>
                          handleChangeSwitch(menu.label, checked)
                        }
                        id={menu.id}
                      />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
