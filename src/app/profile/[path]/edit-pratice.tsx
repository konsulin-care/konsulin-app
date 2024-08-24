import Input from '@/components/general/input'
import { useAuth } from '@/context/auth/authContext'
import withAuth from '@/hooks/withAuth'
import { apiRequest } from '@/services/api'
import {
  convertCurrencyStringToNumber,
  formatCurrency
} from '@/utils/validation'
import { useMutation } from '@tanstack/react-query'
import { XCircle } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

const EditPractice = () => {
  const [searchInput, setSearchInput] = useState('')
  const [tagInputs, setTagInputs] = useState([])
  const [firmData, setFirmData] = useState([])
  const { state: authState } = useAuth()
  const [openCollapsibles, setOpenCollapsibles] = useState({})

  const fetchClinicsData = async (searchTerm: string) => {
    try {
      const [listAllResponse, searchResponse] = await Promise.all([
        apiRequest('GET', `/api/v1/clinics?name=${searchTerm}`),
        apiRequest('GET', `/api/v1/clinicians/${authState.id}/clinics`)
      ])

      return {
        listAllData: listAllResponse['data'],
        searchData: searchResponse['data']
      }
    } catch (error) {
      console.error('Error fetching clinics data:', error)
      throw error
    }
  }

  const { mutate: fetchAndUpdateClinics } = useMutation({
    mutationFn: async (searchTerm: string) => {
      const { listAllData, searchData } = await fetchClinicsData(searchTerm)

      const initialFirmData = listAllData.map(clinic => ({
        clinic_id: clinic.clinic_id,
        nameFirm: clinic.clinic_name,
        price_per_session: {
          value: '',
          currency: 'IDR'
        },
        specialties: Array.isArray(clinic.tags) ? clinic.tags : []
      }))

      const updatedFirmData = initialFirmData.map(clinic => {
        const updatedClinic = searchData.find(
          searchResult => searchResult.clinic_id === clinic.clinic_id
        )
        if (updatedClinic) {
          return {
            ...clinic,
            price_per_session: {
              value: formatCurrency(`${updatedClinic.price_per_session.value}`),
              currency: updatedClinic.price_per_session.currency
            },
            specialties: Array.isArray(updatedClinic.specialties)
              ? updatedClinic.specialties
              : []
          }
        }
        return clinic
      })

      setFirmData(updatedFirmData)
      setTagInputs(new Array(updatedFirmData.length).fill(''))
    },
    onError: error => {
      console.error('Error updating clinics:', error)
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
    fetchAndUpdateClinics('')
  }, [fetchAndUpdateClinics])

  const handleToggle = useCallback(index => {
    setOpenCollapsibles(prevState => ({
      ...prevState,
      [index]: !prevState[index]
    }))
  }, [])

  const handleAddTag = useCallback(
    (
      index: string | number,
      e: { key: string; preventDefault: () => void }
    ) => {
      if (e.key === 'Enter' && tagInputs[index].trim() !== '') {
        e.preventDefault()
        setFirmData(prevData => {
          const updatedData = [...prevData]
          if (
            !updatedData[index].specialties.includes(tagInputs[index].trim())
          ) {
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
    },
    [tagInputs]
  )

  const handleChangeFee = useCallback((index, e) => {
    const formattedValue = formatCurrency(e.target.value)
    setFirmData(prevData => {
      const updatedData = [...prevData]
      updatedData[index].price_per_session.value = formattedValue
      return updatedData
    })
  }, [])

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

  const searchClinicByName = value => {
    setSearchInput(value)
    fetchAndUpdateClinics(value)
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
      <div className='mt-2 flex w-full items-center justify-between rounded-lg bg-[#F9F9F9]'>
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
          <span className='pl-2 text-sm'>{data.nameFirm}</span>
        </div>
        {isOpen ? null : (
          <div
            className={`rounded-full ${convertCurrencyStringToNumber(data.price_per_session.value) !== 0 ? 'bg-secondary' : 'bg-[#808387]'} p-1 px-2`}
          >
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
      data={firm}
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
