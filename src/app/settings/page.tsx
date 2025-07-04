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
    link: '/forget-password',
    isEnabled: true
  },
  {
    id: 'faq',
    iconUrl: '/icons/popup-chat.svg',
    label: 'FAQ',
    link: '/',
    isEnabled: false
  },
  {
    id: 'penilaian',
    iconUrl: '/icons/thumb-up.svg',
    label: 'Penilaian',
    link: '/',
    isEnabled: false
  },
  {
    id: 'localization',
    iconUrl: '/icons/world.svg',
    label: 'Pengaturan Bahasa',
    link: '/',
    isEnabled: false
  },
  {
    id: 'notification',
    iconUrl: '/icons/bell-setting.svg',
    label: 'Pengaturan Notifikasi',
    link: '/',
    isEnabled: false
  },
  {
    id: 'session-reminder',
    iconUrl: '',
    label: 'Session Reminder',
    type: 'switch',
    isEnabled: true
  },
  {
    id: 'news-updates',
    iconUrl: '',
    type: 'switch',
    label: 'News & Updates',
    isEnabled: true
  },
  {
    id: 'term-and-condition',
    iconUrl: '/icons/note.svg',
    label: 'Syarat & Ketentuan',
    link: '/',
    isEnabled: false
  },
  {
    id: 'information-app',
    iconUrl: '/icons/info.svg',
    label: 'Informasi Aplikasi',
    desc: `Versi ${process.env.NEXT_PUBLIC_APP_VERSION}`,
    link: '/',
    isEnabled: true
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
    <>
      <p className='pb-2 pt-4 text-sm font-normal text-[#26282C] opacity-50'>
        Pengaturan
      </p>
      <ul>
        {settingLists.map((menu, index) => (
          <li
            key={menu.id}
            className={`flex items-center justify-between ${index === settingLists.length - 1 ? 'py-2' : 'border-b-[0.5px] border-[#E8E8E8] py-2'}`}
          >
            <div className='flex h-[44px] flex-grow items-center'>
              {menu.iconUrl && (
                <div className='px-[12px] py-[12px]'>
                  <Image
                    src={menu.iconUrl}
                    width={24}
                    height={24}
                    alt={`${menu.label}-icon`}
                  />
                </div>
              )}
              <div
                className={
                  menu.desc
                    ? 'flex flex-col items-start pl-4'
                    : 'py-[11px] pl-4'
                }
              >
                <p
                  className={`text-black-100 text-xs font-normal ${!menu.isEnabled ? 'opacity-30' : ''} ${menu.type === 'switch' && 'opacity-30'}`}
                >
                  {menu.label}
                </p>
                {menu.desc && (
                  <p className='text-[10px] font-normal text-[#2C2F35] opacity-60'>
                    {menu.desc}
                  </p>
                )}
              </div>
            </div>

            <div className='flex h-[44px] items-center py-[11px]'>
              {menu.type === 'switch' ? (
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
                  thumbColor='bg-switch-gradient-thumb'
                  thumbShadow='shadow-switch-thumb-setting'
                  className={`pr-[13px] ${
                    menu.label === 'Session Reminder'
                      ? sessionEnabled
                        ? 'data-[state=checked] h-[14px] w-[34px] border-0 bg-switch-gradient-checked-line'
                        : 'data-[state=unchecked] h-[14px] w-[34px] border-0 bg-switch-gradient-unchecked-line'
                      : newUpdatesEnabled
                        ? 'data-[state=checked] h-[14px] w-[34px] border-0 bg-switch-gradient-checked-line'
                        : 'data-[state=unchecked] h-[14px] w-[34px] border-0 bg-switch-gradient-unchecked-line'
                  }`}
                  disabled
                />
              ) : (
                menu.isEnabled &&
                menu.label !== 'Informasi Aplikasi' &&
                menu.link && (
                  <Link href={menu.link} className='flex h-full items-center'>
                    <ChevronRight color='#ADB6C7' width={24} height={24} />
                  </Link>
                )
              )}
              {!menu.isEnabled && menu.label !== 'Informasi Aplikasi' && (
                <div className='cursor-not-allowed opacity-50'>
                  <ChevronRight color='#ADB6C7' width={24} height={24} />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
