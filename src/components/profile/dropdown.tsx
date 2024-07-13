import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function Dropdown({
  options,
  placeholder,
  onChange,
  className
}: any) {
  const [selectedOption, setSelectedOption] = useState({
    label: '',
    value: ''
  })
  const [isOpen, setIsOpen] = useState(false)

  function handleChange(opt: any) {
    setSelectedOption({
      label: opt.label,
      value: opt.value
    })
    onChange(opt.value)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className='flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#E3E3E3] p-4'
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className='flex-grow text-sm font-normal text-[#2C2F35]'>
          {selectedOption.label || placeholder}
        </span>
        <ChevronDown color='#18AAA1' />
      </div>
      {isOpen && (
        <ul className='absolute left-0 right-0 top-0 z-10 my-4 max-h-80 overflow-auto border border-[#E3E3E3] bg-white shadow-lg'>
          {options.map((option: any) => (
            <li
              key={option.value}
              className='cursor-pointer px-4 py-2 text-sm font-normal text-[#2C2F35] hover:bg-secondary'
              onClick={() => handleChange(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
