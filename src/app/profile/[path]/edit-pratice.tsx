import Input from '@/components/general/input'
import { useAuth } from '@/context/auth/authContext'
import withAuth from '@/hooks/withAuth'
import { apiRequest } from '@/services/api'
import { useMutation } from '@tanstack/react-query'
import { XCircle } from 'lucide-react'
import Image from 'next/image'
import { SetStateAction, useEffect, useState } from 'react'

type FormattedClinic = {
  clinic_id: string
  nameFirm: string
  price_per_session: { value: string; currency: string }
  specialties: string[]
}

const EditPractice = () => {
  const [searchInput, setSearchInput] = useState('')
  const [tagInputs, setTagInputs] = useState([])
  const [firmData, setFirmData] = useState([])
  const { state: authState } = useAuth()
  const [openCollapsibles, setOpenCollapsibles] = useState({})

  const { mutate: searchClinics } = useMutation({
    mutationFn: async (searchTerm: SetStateAction<string>) => {
      const response = await apiRequest(
        'GET',
        `/api/v1/clinicians/${authState.id}/clinics?name=${searchTerm}`
      )
      return response
    },
    onSuccess: ({ data }: any) => {
      if (Array.isArray(data)) {
        const formattedFirmData: FormattedClinic[] = data.map(clinic => ({
          clinic_id: clinic.clinic_id,
          nameFirm: clinic.clinic_name,
          price_per_session: {
            value: formatCurrency(`${clinic.price_per_session.value}`),
            currency: clinic.price_per_session.currency
          },
          specialties: Array.isArray(clinic.specialties)
            ? clinic.specialties
            : []
        }))

        setFirmData(formattedFirmData)
        setTagInputs(new Array(formattedFirmData.length).fill(''))
      } else {
        console.error('Data is not an array:', data)
      }
    },
    onError: error => {
      console.error('Error searching clinics:', error)
    }
  })

  const { mutate: saveFirms, isPending } = useMutation({
    mutationFn: async (updateFirms: any[]) => {
      try {
        const response = await apiRequest(
          'POST',
          '/api/v1/clinicians/clinics/practice-information',
          {
            practice_informations: updateFirms
          }
        )
        return response
      } catch (err) {
        throw err
      }
    },
    onSuccess: () => {
      setOpenCollapsibles({})
    }
  })

  useEffect(() => {
    searchClinics('')
  }, [searchClinics])

  function handleToggle(index: any) {
    setOpenCollapsibles(prevState => ({
      ...prevState,
      [index]: !prevState[index]
    }))
  }

  function handleAddTag(
    index: string | number,
    e: { key: string; preventDefault: () => void }
  ) {
    if (e.key === 'Enter' && tagInputs[index].trim() !== '') {
      e.preventDefault()
      setFirmData(prevData => {
        const updatedData = [...prevData]
        if (!updatedData[index].specialties.includes(tagInputs[index].trim())) {
          updatedData[index].specialties.push(tagInputs[index].trim())
        }
        return updatedData
      })
      setTagInputs(prevTags => {
        const updatedTags = [...prevTags]
        updatedTags[index] = ''
        return updatedTags
      })
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

  function convertCurrencyStringToNumber(currencyString: string) {
    const numberString = currencyString.replace(/[^0-9]/g, '')
    return parseInt(numberString, 10)
  }

  function handleChangeFee(
    index: string | number,
    e: { target: { value: any } }
  ) {
    const formattedValue = formatCurrency(e.target.value)
    setFirmData(prevData => {
      const updatedData = [...prevData]
      updatedData[index].price_per_session.value = formattedValue
      return updatedData
    })
  }

  function handleSubmit() {
    const updatedFirmsData = firmData.map(({ nameFirm, ...rest }) => ({
      ...rest,
      price_per_session: {
        ...rest.price_per_session,
        value: convertCurrencyStringToNumber(rest.price_per_session.value)
      }
    }))
    saveFirms(updatedFirmsData)
  }

  function searchClinicByName(value: SetStateAction<string>) {
    setSearchInput(value)
    searchClinics(value)
  }

  function handleRemoveTag(index: string | number, tagIndex: any) {
    setFirmData(prevData => {
      const updatedData = [...prevData]

      updatedData[index] = {
        ...updatedData[index],
        specialties: updatedData[index].specialties.filter(
          (_: any, i: any) => i !== tagIndex
        )
      }

      return updatedData
    })
  }

  return (
    <>
      <div className='flex h-[52px] w-full items-center justify-between rounded-lg bg-[#F9F9F9] p-4'>
        <p className='text-[10px] font-normal text-[#2C2F35] opacity-40'>
          Current Firm
        </p>
        <p className='text-[14px] font-bold text-[#2C2F35]'>Konsulin</p>
      </div>

      <div className='mt-4 flex w-full items-center justify-between rounded-lg bg-[#F9F9F9]'>
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
          onChange={(event: { target: { value: any } }) =>
            searchClinicByName(event.target.value)
          }
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
          <CollapsibleItem
            key={index}
            index={index}
            firm={firm}
            isOpen={!!openCollapsibles[index]}
            onToggle={handleToggle}
            tagInputs={tagInputs}
            handleChangeFee={handleChangeFee}
            handleAddTag={handleAddTag}
            handleRemoveTag={handleRemoveTag}
            setTagInputs={setTagInputs}
          />
        ))}
      </div>

      <div className='fixed bottom-0 left-0 right-0 flex justify-center border-t bg-white p-4'>
        <div className='w-full max-w-screen-sm'>
          <button
            onClick={handleSubmit}
            className='w-full rounded-[32px] bg-secondary py-2 font-normal text-white'
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Simpan'}
          </button>
        </div>
      </div>
    </>
  )
}

const FeeInput = ({ id, value, onChange }) => {
  return (
    <div className='flex w-full items-center justify-between'>
      <label htmlFor={id} className='text-sm font-medium text-gray-700'>
        Fee
      </label>
      <input
        id={id}
        type='text'
        className='w-3/4 rounded-lg border px-3 py-2 text-gray-900'
        value={value}
        onChange={onChange}
        placeholder='Rp 250.000'
      />
    </div>
  )
}

const SpecialtiesSection = ({
  id,
  specialties,
  tagInput,
  onTagChange,
  onTagAdd,
  onTagRemove
}) => {
  return (
    <div className='mt-2 flex w-full items-center'>
      <div className='w-1/4'>
        <label htmlFor={id} className='text-sm font-medium text-gray-700'>
          Specialties
        </label>
      </div>
      <div className='relative w-3/4 rounded-lg border bg-white px-3 py-2 text-gray-900'>
        <div className='mb-2 flex flex-wrap gap-2'>
          {specialties.map((tag, tagIndex) => (
            <div
              key={tagIndex}
              className='text-md flex items-center space-x-1 rounded-full bg-[#F9F9F9] px-2 py-1 text-gray-700'
            >
              <span>{tag}</span>
              <button
                type='button'
                onClick={() => onTagRemove(tagIndex)}
                className='focus:outline-none'
                aria-label='Remove tag'
              >
                <XCircle color='#FF6B6B' size={16} />
              </button>
            </div>
          ))}
        </div>
        <textarea
          id={id}
          value={tagInput}
          onChange={onTagChange}
          onKeyDown={onTagAdd}
          className='w-full rounded-lg border p-2 text-sm text-gray-900'
          placeholder='Add a new specialty and press Enter'
        />
      </div>
    </div>
  )
}

const Collapsible = ({ isOpen, onToggle, children, data }) => {
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

const CollapsibleItem = ({
  index,
  firm,
  isOpen,
  onToggle,
  tagInputs,
  handleChangeFee,
  handleAddTag,
  handleRemoveTag,
  setTagInputs
}) => {
  return (
    <Collapsible
      key={index}
      isOpen={isOpen}
      onToggle={() => onToggle(index)}
      data={firm.nameFirm}
    >
      <div className='flex flex-col space-y-2'>
        <FeeInput
          id={`fee-${index}`}
          value={firm.price_per_session.value}
          onChange={(e: any) => handleChangeFee(index, e)}
        />
        <SpecialtiesSection
          id={`specialty-${index}`}
          specialties={firm.specialties}
          tagInput={tagInputs[index] || ''}
          onTagChange={(e: { target: { value: any } }) =>
            setTagInputs((prevTags: any) => {
              const updatedTags = [...prevTags]
              updatedTags[index] = e.target.value
              return updatedTags
            })
          }
          onTagAdd={(e: any) => handleAddTag(index, e)}
          onTagRemove={(tagIndex: any) => handleRemoveTag(index, tagIndex)}
        />
        <div className='mt-4'>
          <button
            onClick={() => onToggle(index)}
            className='w-full rounded-[32px] bg-secondary py-2 font-normal text-white'
          >
            Save
          </button>
        </div>
      </div>
    </Collapsible>
  )
}

export default withAuth(EditPractice, ['clinician'], true)
