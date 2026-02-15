"use client"

import { useState, useEffect } from 'react'
import { useCurrency } from '@/lib/currency-context'
import { convertCurrency, formatPrice, SupportedCurrency } from '@/lib/currency'

interface PriceProps {
  amount: number
  baseCurrency?: SupportedCurrency
  className?: string
  showCode?: boolean
  large?: boolean
}

/**
 * Price component that automatically converts and formats prices
 * based on user's preferred currency
 */
export default function Price({
  amount,
  baseCurrency = 'EUR',
  className = '',
  showCode = false,
  large = false
}: PriceProps) {
  const { currency, isLoading } = useCurrency()
  const [convertedAmount, setConvertedAmount] = useState(amount)
  const [isConverting, setIsConverting] = useState(true)

  useEffect(() => {
    const convert = async () => {
      if (baseCurrency === currency) {
        setConvertedAmount(amount)
        setIsConverting(false)
        return
      }

      try {
        const converted = await convertCurrency(amount, baseCurrency, currency)
        setConvertedAmount(converted)
      } catch (error) {
        console.error('Error converting currency:', error)
        setConvertedAmount(amount) // Fallback to base amount
      } finally {
        setIsConverting(false)
      }
    }

    convert()
  }, [amount, baseCurrency, currency])

  // Always call all hooks before any conditional rendering
  const formatted = formatPrice(convertedAmount, currency, { showCode })

  // Conditional rendering AFTER all hooks
  if (isLoading || isConverting) {
    return (
      <span className={`${className} ${large ? 'text-2xl' : 'text-base'} font-bold animate-pulse`}>
        ...
      </span>
    )
  }

  return (
    <span className={`${className} ${large ? 'text-2xl' : 'text-base'} font-bold`}>
      {formatted}
    </span>
  )
}
