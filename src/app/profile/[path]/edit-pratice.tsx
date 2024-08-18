import Input from '@/components/general/input'
import { XCircle } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

export default function EditPractice() {
  const [searchInput, setSearchInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [firms, setFirms] = useState(['Firm 1', 'Firm 2', 'Firm 3', 'Firm 4'])
  const [openCollapsibles, setOpenCollapsibles] = useState({})

  const [firmData, setFirmData] = useState(
    firms.map(firm => ({
      nameFirm: firm,
      data: {
        fee: '',
        specialties: []
      }
    }))
  )

  const handleToggle = (index: any) => {
    setOpenCollapsibles(prevState => ({
      ...prevState,
      [index]: !prevState[index]
    }))
  }

  function handleAddTag(index, e) {
    if (e.key === 'Enter' && tagInput.trim() !== '') {
      e.preventDefault()
      setFirmData(prevData => {
        const updatedData = [...prevData]
        if (!updatedData[index].data.specialties.includes(tagInput.trim())) {
          updatedData[index].data.specialties.push(tagInput.trim())
        }
        return updatedData
      })
      setTagInput('')
    }
  }

  function formatCurrency(value: any) {
    const numberValue = parseInt(value.replace(/[^0-9]/g, ''), 10)
    if (isNaN(numberValue)) {
      return ''
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numberValue)
  }

  function convertCurrencyStringToNumber(currencyString) {
    const numberString = currencyString.replace(/[^0-9]/g, '')
    return parseInt(numberString, 10)
  }

  function handleChangeFee(index, e) {
    const formattedValue = formatCurrency(e.target.value)
    setFirmData(prevData => {
      const updatedData = [...prevData]
      updatedData[index].data.fee = formattedValue
      return updatedData
    })
  }

  function handleSubmit() {
    const updatedFirmsData = firmData.map(firm => ({
      ...firm,
      data: {
        ...firm.data,
        fee: convertCurrencyStringToNumber(firm.data.fee)
      }
    }))
    console.log(updatedFirmsData)
  }

  return (
    <>
      <div className='flex h-[52px] w-full items-center justify-between rounded-lg bg-[#F9F9F9] p-4'>
        <p className='text-[10px] font-normal text-[#2C2F35] opacity-40'>
          Current Firm
        </p>
        <p className='text-[14px] font-bold text-[#2C2F35]'>Konsulin</p>
      </div>

      <div className='my-4 flex w-full items-center justify-between rounded-lg bg-[#F9F9F9]'>
        <Input
          className='flex h-[50px] w-[85%] items-center space-x-2 rounded-lg border-none bg-[#F9F9F9] p-4'
          width={12}
          height={12}
          prefixIcon='/icons/search-cyan.svg'
          placeholder='Search Firm'
          name='searchInput'
          id='searchInput'
          type='text'
          backgroundColor='[#F9F9F9]'
          value={searchInput}
          opacity={false}
          onChange={event => setSearchInput(event.target.value)}
          outline={false}
        />
        <div className='ml-2 flex h-[50px] items-center justify-center rounded-lg bg-[#F9F9F9] p-4'>
          <Image
            width={20}
            height={20}
            src={'/icons/filter.svg'}
            alt='filter-icon'
          />
        </div>
      </div>

      <div className='max-h-[calc(100vh-200px)] overflow-y-auto pb-[100px]'>
        {firmData.map((firm, index) => (
          <Collapsible
            key={index}
            isOpen={!!openCollapsibles[index]}
            onToggle={() => handleToggle(index)}
            data={firm.nameFirm}
          >
            <div className='flex flex-col space-y-2'>
              <div className='flex w-full items-center justify-between'>
                <label
                  htmlFor={`fee-${index}`}
                  className='text-sm font-medium text-gray-700'
                >
                  Fee
                </label>
                <input
                  id={`fee-${index}`}
                  type='text'
                  className='w-3/4 rounded-lg border px-3 py-2 text-gray-900'
                  value={firm.data.fee}
                  onChange={e => handleChangeFee(index, e)}
                  placeholder='Rp 250.000'
                />
              </div>

              <div className='mt-2 flex w-full items-center'>
                <div className='w-1/4'>
                  <label
                    htmlFor={`specialty-${index}`}
                    className='text-sm font-medium text-gray-700'
                  >
                    Specialties
                  </label>
                </div>
                <div className='relative w-3/4 rounded-lg border bg-white px-3 py-2 text-gray-900'>
                  <div className='mb-2 flex flex-wrap gap-2'>
                    {firm.data.specialties.map((tag, tagIndex) => (
                      <div
                        key={tagIndex}
                        className='flex items-center space-x-1 rounded-full bg-[#F9F9F9] px-2 py-1 text-gray-700'
                      >
                        <span>{tag}</span>
                        <button
                          type='button'
                          onClick={() =>
                            setFirmData(prevData => {
                              const updatedData = [...prevData]
                              updatedData[index].data.specialties = updatedData[
                                index
                              ].data.specialties.filter(
                                (_, i) => i !== tagIndex
                              )
                              return updatedData
                            })
                          }
                          className='focus:outline-none'
                          aria-label='Remove tag'
                        >
                          <XCircle color='#FF6B6B' size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <textarea
                    id={`specialty-${index}`}
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => handleAddTag(index, e)}
                    placeholder='Type and press Enter to add specialties'
                    className='w-full resize-none border-none bg-white text-sm focus:outline-none'
                    rows={1}
                  />
                </div>
              </div>
              <div className='mt-4'>
                <button
                  onClick={() => handleToggle(index)}
                  className='w-full rounded-[32px] bg-secondary py-2 font-normal text-white'
                >
                  Save
                </button>
              </div>
            </div>
          </Collapsible>
        ))}
      </div>

      <div className='fixed bottom-0 left-0 right-0 flex justify-center border-t bg-white p-4'>
        <div className='w-full max-w-screen-sm'>
          <button
            onClick={handleSubmit}
            className='w-full rounded-[32px] bg-secondary py-2 font-normal text-white'
          >
            Simpan
          </button>
        </div>
      </div>
    </>
  )
}

function Collapsible({ isOpen, onToggle, children, data }) {
  return (
    <div className='collapsible my-4 rounded-[25px] border bg-gray-50'>
      <button
        className={`toggle flex w-full items-center justify-between rounded-[25px] p-2 text-left focus:outline-none ${
          isOpen
            ? 'bg-secondary text-[18px] font-bold text-white'
            : 'bg-transparent text-gray-700'
        }`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls='collapsible-content'
      >
        <div className='flex items-center'>
          <Image
            src='/images/sample-foto.svg'
            alt='Prefix Icon'
            width={38}
            height={38}
          />
          <span className='pl-2 text-sm'>{data}</span>
        </div>
        {isOpen ? null : (
          <div className='rounded-full bg-[#808387] p-1 px-2'>
            <p className='text-[12px] text-white'>Select</p>
          </div>
        )}
      </button>
      {isOpen && (
        <div
          id='collapsible-content'
          className='content rounded-b-[25px] bg-gray-50 p-4'
        >
          {children}
        </div>
      )}
    </div>
  )
}
