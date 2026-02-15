"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { SupportedCurrency, getUserCurrency, setUserCurrency, getUserCountry } from './currency'

interface CurrencyContextType {
  currency: SupportedCurrency
  setCurrency: (currency: SupportedCurrency) => void
  countryCode: string
  isLoading: boolean
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>('EUR')
  const [countryCode, setCountryCode] = useState<string>('DE')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize currency and country on mount
    const initializeCurrency = async () => {
      try {
        const userCurrency = getUserCurrency()
        const userCountry = await getUserCountry()

        setCurrencyState(userCurrency)
        setCountryCode(userCountry)
      } catch (error) {
        console.error('Error initializing currency:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeCurrency()
  }, [])

  const handleSetCurrency = (newCurrency: SupportedCurrency) => {
    setCurrencyState(newCurrency)
    setUserCurrency(newCurrency)
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency: handleSetCurrency,
        countryCode,
        isLoading
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
