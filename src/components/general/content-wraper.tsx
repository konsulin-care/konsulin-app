import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface ContentWrapperProps {
  className?: HTMLAnchorElement['className']
  children: ReactNode
}

export default function ContentWraper({
  className,
  children
}: ContentWrapperProps) {
  return (
    <div
      className={cn(
        'mt-[-24px] min-h-screen rounded-[16px] bg-white pb-[100px]',
        className
      )}
    >
      {children}
    </div>
  )
}
