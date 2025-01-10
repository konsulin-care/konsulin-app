'use client'

import React, { ReactNode, createContext, useContext, useReducer } from 'react'
import { initialState, reducer } from './bookingReducer'
import { IActionBooking, IStateBooking } from './bookingTypes'

interface ContextProps {
  state: IStateBooking
  dispatch: React.Dispatch<IActionBooking>
}

const BookingContext = createContext<ContextProps | undefined>(undefined)

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      {children}
    </BookingContext.Provider>
  )
}

export const useBooking = (): ContextProps => {
  const context = useContext(BookingContext)
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider')
  }

  return context
}
