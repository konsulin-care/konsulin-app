'use client'

import FhirFormsRenderer from '@/components/general/fhir-forms-renderer'
import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import { BookHeartIcon, ChevronLeftIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ObjectiveFindingModal from './objective-finding-modal'
import Participant from './participant'

const Soap: React.FC<IWithAuth> = ({ userRole, isAuthenticated }) => {
  const router = useRouter()
  const questionnaire = require('../questionnaire/soap.json')

  const [participant, setParticipant] = useState('Fitra Agil')
  const [objectiveFinding, setObjectiveFinding] = useState([])

  const customObjectFHIR = {
    subject: participant,
    author: ''
  }

  return (
    <NavigationBar>
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />

          <div className='text-[14px] font-bold text-white'>Summary Record</div>
        </div>
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white'>
        <div className='min-h-screen p-4'>
          <Participant
            participant={participant}
            onChange={participant => setParticipant(participant)}
          />

          <div className='card flex items-center'>
            <BookHeartIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
            <div className='mr-auto text-[14px] font-bold'>
              Objective Finding
            </div>
            <ObjectiveFindingModal
              objectiveFinding={objectiveFinding}
              onChange={objectiveFinding =>
                setObjectiveFinding(objectiveFinding)
              }
            />
          </div>

          <FhirFormsRenderer
            questionnaire={questionnaire}
            isAuthenticated={isAuthenticated}
            submitText='Save SOAP'
            customObject={customObjectFHIR}
          />
        </div>
      </div>
    </NavigationBar>
  )
}

export default withAuth(Soap, ['patient', 'clinician'], true)
