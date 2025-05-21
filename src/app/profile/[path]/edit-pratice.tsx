'use client';

import Input from '@/components/general/input';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import {
  useCreateInvoice,
  useGetPractitionerRolesDetail,
  useUpdateInvoice,
  useUpdatePractitionerInfo
} from '@/services/clinicians';
import { IPractitionerRoleDetail } from '@/types/practitioner';
import { mapAddress, removeCityPrefix } from '@/utils/helper';
import { BundleEntry, CodeableConcept } from 'fhir/r4';
import { XCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import FirmFilter, { IFirmFilter } from './firm-filter';

const EditPractice = () => {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [firmFilter, setFirmFilter] = useState({ city: null });
  const [tagInputs, setTagInputs] = useState([]);
  const [firmData, setFirmData] = useState([]);
  const [invoiceData, setInvoiceData] = useState([]);
  const { state: authState } = useAuth();
  const [openCollapsibles, setOpenCollapsibles] = useState({});

  const {
    isLoading: isPractitionerRolesLoading,
    isFetching: isPractitionerRolesFetching
  } = useGetPractitionerRolesDetail(authState.userInfo.fhirId, {
    onSuccess: data => {
      const resources = data?.map(entry => entry.resource) || [];
      console.log('before map', resources);

      /* separate invoice data from the main data
       * because they use different endpoints */
      const invoiceDataList = [];
      const firmDataList = [];

      resources.forEach(resource => {
        const { invoiceData, id, ...rest } = resource;

        const initialInvoice = {
          resourceType: 'Invoice',
          status: 'draft',
          totalNet: {
            value: 0,
            currency: 'IDR'
          },
          participant: [
            {
              actor: {
                reference: `PractitionerRole/${id}`
              }
            }
          ]
        };

        invoiceDataList.push(invoiceData || initialInvoice);
        firmDataList.push({ id, ...rest });
      });

      setInvoiceData(invoiceDataList);
      setFirmData(firmDataList);
    }
  });

  const {
    mutateAsync: updatePractitionerInfo,
    isLoading: isUpdatePractitionerLoading
  } = useUpdatePractitionerInfo();
  const { mutateAsync: createInvoice, isLoading: isCreateInvoiceLoading } =
    useCreateInvoice();
  const { mutateAsync: updateInvoice, isLoading: isUpdateInvoiceLoading } =
    useUpdateInvoice();

  useEffect(() => {
    console.log('firm data', firmData);
    console.log('invoice data', invoiceData);
  }, [firmData, invoiceData]);

  const isDataLoading =
    isCreateInvoiceLoading ||
    isUpdatePractitionerLoading ||
    isUpdateInvoiceLoading;

  const filteredFirmData = useMemo(() => {
    if (!firmData || firmData.length === 0) return [];

    const { city } = firmFilter;
    const lowerKeyword = searchInput.trim().toLowerCase();

    if (!lowerKeyword && !city) return firmData;

    return firmData.filter((data: IPractitionerRoleDetail) => {
      const organizationName = data.organizationData?.name?.toLowerCase() || '';
      const organizationCity = data.organizationData?.address?.[0]?.city || '';

      const nameMatches =
        !lowerKeyword || organizationName.includes(lowerKeyword);
      const cityMatches = !city || removeCityPrefix(city) === organizationCity;

      return nameMatches && cityMatches;
    });
  }, [firmData, firmFilter, searchInput]);

  const handleSubmitFirmDetails = async (index: number) => {
    if (index === undefined || index === null) return;

    /* preserve scheduleData and organizationData for later use */
    const { scheduleData, organizationData, ...firmPayload } = firmData[index];
    const invoicePayload = { ...invoiceData[index] };

    const updatedInvoice = [...invoiceData];
    const updatedFirm = [...firmData];

    try {
      if (invoicePayload.status === 'draft' && !invoicePayload.id) {
        invoicePayload.status = 'final';
        const result = await createInvoice(invoicePayload);

        if (result) {
          updatedInvoice[index] = result;
          setInvoiceData(updatedInvoice);
        }
      } else {
        const result = await updateInvoice(invoicePayload);

        if (result) {
          updatedInvoice[index] = result;
          setInvoiceData(updatedInvoice);
        }
      }

      const result = await updatePractitionerInfo(firmPayload);
      if (result) {
        updatedFirm[index] = { scheduleData, organizationData, ...result };
        setFirmData(updatedFirm);
        handleToggle(index);
        toast.success('Data berhasil disimpan');
      }
    } catch (error) {
      toast.error('Data gagal disimpan');
      console.log('Error when submitting the data: ', error);
    }
  };

  const handleSubmitFirmsStatus = async () => {
    const cleanedFirmsData = firmData.map(firm => {
      const { scheduleData, organizationData, ...rest } = firm;
      return rest;
    });

    try {
      await Promise.all(
        cleanedFirmsData.map(firm => updatePractitionerInfo(firm))
      );

      toast.success('Semua data berhasil disimpan');
      setIsDrawerOpen(true);
    } catch (error) {
      toast.error('Gagal menyimpan sebagian atau seluruh data');
      console.log('Batch update error:', error);
    }
  };

  const handleToggle = useCallback((index: number) => {
    setOpenCollapsibles(prevState => ({
      ...prevState,
      [index]: !prevState[index]
    }));
  }, []);

  const handleAddTag = useCallback(
    (index: number, e: { key: string; preventDefault: () => void }) => {
      const inputValue = tagInputs[index]?.trim();

      if (e.key === 'Enter' && inputValue !== '') {
        e.preventDefault(); // prevent "Enter" to create a new line

        setFirmData(prevData => {
          const updatedData = [...prevData];
          const currentSpecialties = updatedData[index].specialty || [];
          const alreadyExists = currentSpecialties.some(
            (specialty: CodeableConcept) =>
              specialty.text.toLowerCase() === inputValue.toLowerCase()
          );

          if (!alreadyExists) {
            updatedData[index] = {
              ...updatedData[index],
              specialty: [...currentSpecialties, { text: inputValue }]
            };
          }

          return updatedData;
        });

        // clearing input after tag is added
        setTagInputs(prevTags => {
          const updatedTags = [...prevTags];
          updatedTags[index] = '';
          return updatedTags;
        });
      }
    },
    [tagInputs]
  );

  const handleChangeFee = useCallback((index: number, value: string) => {
    setInvoiceData(prevData => {
      const updatedData = [...prevData];
      updatedData[index] = {
        ...updatedData[index],
        totalNet: {
          ...updatedData[index].totalNet,
          value: Number(value)
        }
      };
      return updatedData;
    });
  }, []);

  const handleChangeStatus = useCallback((index: number, value: boolean) => {
    setFirmData(prevData => {
      const updatedData = [...prevData];
      updatedData[index] = {
        ...updatedData[index],
        active: value
      };
      return updatedData;
    });
  }, []);

  function handleRemoveTag(index: number, tagIndex: number) {
    setFirmData(prevData => {
      const updatedData = [...prevData];
      updatedData[index] = {
        ...updatedData[index],
        specialty: updatedData[index].specialty.filter(
          (_: any, i: any) => i !== tagIndex
        )
      };
      return updatedData;
    });
  }

  return (
    // TODO: add carousel (auto 5s) for current firm
    <>
      <div className='flex min-h-[calc(100vh-105px)] flex-col'>
        <div className='flex flex-1 flex-col overflow-hidden'>
          <div className='flex items-center gap-4'>
            <div className='flex w-full items-center justify-between rounded-lg bg-[#F9F9F9]'>
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
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchInput(event.target.value)
                }
                outline={false}
              />
            </div>

            <FirmFilter
              onChange={(filter: IFirmFilter) => {
                setFirmFilter(prevState => ({
                  ...prevState,
                  ...filter
                }));
              }}
            />
          </div>

          <div className='flex gap-4'>
            {firmFilter.city && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {firmFilter.city}
              </Badge>
            )}
          </div>

          <div className='flex-1 overflow-y-auto pb-[15px]'>
            {isPractitionerRolesLoading || isPractitionerRolesFetching ? (
              <Skeleton
                count={4}
                className='mt-4 h-[60px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
              />
            ) : (
              filteredFirmData.map(
                (firm: BundleEntry<IPractitionerRoleDetail>, index: number) => (
                  <CollapsibleItem
                    key={firm.id}
                    index={index}
                    firm={firm}
                    invoice={invoiceData[index]}
                    isOpen={!!openCollapsibles[index]}
                    onToggle={handleToggle}
                    tagInputs={tagInputs}
                    handleChangeFee={handleChangeFee}
                    handleAddTag={handleAddTag}
                    handleRemoveTag={handleRemoveTag}
                    setTagInputs={setTagInputs}
                    handleSubmitFirmDetails={handleSubmitFirmDetails}
                    handleChangeStatus={handleChangeStatus}
                    isDataLoading={isDataLoading}
                  />
                )
              )
            )}
          </div>
        </div>

        <div className='flex justify-center bg-white px-4 pt-4'>
          <div className='flex w-full max-w-screen-sm items-center justify-center'>
            <Button
              onClick={handleSubmitFirmsStatus}
              className='w-full rounded-[32px] bg-secondary py-2 font-normal text-white'
              disabled={isUpdatePractitionerLoading}
            >
              {isUpdatePractitionerLoading ? (
                <LoadingSpinnerIcon
                  width={20}
                  height={20}
                  stroke='white'
                  className='mx-auto animate-spin'
                />
              ) : (
                'Simpan'
              )}
            </Button>
          </div>
        </div>
      </div>

      <Drawer open={isDrawerOpen}>
        <DrawerTrigger />
        <DrawerContent className='mx-auto flex w-full max-w-screen-sm flex-col'>
          <DrawerHeader>
            <DrawerTitle className='text-center text-xl font-bold text-[#2C2F35] opacity-100'>
              Changes Successful!
            </DrawerTitle>
            <DrawerDescription className='text-center text-sm text-[#2C2F35] opacity-60'>
              Your edit to your practice information is successfully saved.
            </DrawerDescription>
          </DrawerHeader>
          <Button
            onClick={() => {
              setIsDrawerOpen(false);
              router.push('/profile');
            }}
            className='mx-4 mb-4 rounded-full border border-[#2C2F35] border-opacity-20 bg-white py-3 text-sm font-bold text-[#2C2F35] opacity-100'
          >
            Close
          </Button>
        </DrawerContent>
      </Drawer>
    </>
  );
};

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
  );
};

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
          {specialties &&
            Array.isArray(specialties) &&
            specialties.map((tag: CodeableConcept, tagIndex: number) => (
              <div
                key={tagIndex}
                className='text-md flex items-center space-x-1 rounded-full bg-[#F9F9F9] px-2 py-1 text-gray-700'
              >
                <span>{tag.text}</span>
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
  );
};

const Collapsible = ({ isOpen, onToggle, children, data, onStatusChange }) => {
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
            className='block rounded-full'
            src='/images/clinic.jpg'
            alt='Prefix Icon'
            width={38}
            height={38}
            style={{ width: '38px', height: '38px' }}
          />
          <div className='flex flex-col justify-center gap-1 pl-2'>
            <span className='text-sm'>{data.organizationData.name}</span>
            <span className='text-xs'>
              {mapAddress(data.organizationData.address)}
            </span>
          </div>
        </div>
        {isOpen ? null : (
          <div
            onClick={e => {
              e.stopPropagation();
              onStatusChange(!data.active);
            }}
            className={`rounded-full ${data.active ? 'bg-secondary' : 'bg-[#808387]'} p-1 px-2`}
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
  );
};

const CollapsibleItem = ({
  index,
  firm,
  invoice,
  isOpen,
  onToggle,
  tagInputs,
  handleChangeFee,
  handleAddTag,
  handleRemoveTag,
  setTagInputs,
  handleSubmitFirmDetails,
  handleChangeStatus,
  isDataLoading
}) => {
  return (
    <Collapsible
      key={index}
      isOpen={isOpen}
      onToggle={() => onToggle(index)}
      data={firm}
      onStatusChange={(status: boolean) => handleChangeStatus(index, status)}
    >
      <div className='flex flex-col space-y-2'>
        <FeeInput
          id={`fee-${index}`}
          value={invoice.totalNet.value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const numberOnly = /^\d*$/;
            if (numberOnly.test(e.target.value)) {
              handleChangeFee(index, e.target.value);
            }
          }}
        />
        <SpecialtiesSection
          id={`specialty-${index}`}
          specialties={firm?.specialty}
          tagInput={tagInputs[index] || ''}
          onTagChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setTagInputs((prevTags: string[]) => {
              const updatedTags = [...prevTags];
              updatedTags[index] = e.target.value;
              return updatedTags;
            })
          }
          onTagAdd={(event: React.ChangeEvent<HTMLInputElement>) =>
            handleAddTag(index, event)
          }
          onTagRemove={(tagIndex: number) => handleRemoveTag(index, tagIndex)}
        />
        <div className='mt-4'>
          <Button
            onClick={() => {
              handleSubmitFirmDetails(index);
            }}
            className='w-full rounded-[32px] bg-secondary py-2 font-normal text-white'
            disabled={isDataLoading}
          >
            {isDataLoading ? (
              <LoadingSpinnerIcon
                width={20}
                height={20}
                stroke='white'
                className='mx-auto animate-spin'
              />
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    </Collapsible>
  );
};

export default EditPractice;
