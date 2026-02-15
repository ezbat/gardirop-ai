"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Check } from 'lucide-react'
import { CURRENCIES, SupportedCurrency } from '@/lib/currency'
import { useCurrency } from '@/lib/currency-context'

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)

  const currencyList = Object.values(CURRENCIES)

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary tap-highlight-none active:scale-95 transition-transform"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{currency}</span>
      </button>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 safe-area-bottom"
            >
              {/* Handle */}
              <div className="bottom-sheet-handle" />

              {/* Header */}
              <div className="p-6 pb-4">
                <h2 className="text-xl font-bold">Select Currency</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Prices will be converted to your preferred currency
                </p>
              </div>

              {/* Currency List */}
              <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto hide-scrollbar">
                {currencyList.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => {
                      setCurrency(curr.code)
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl tap-highlight-none active:scale-98 transition-transform mb-2"
                    style={{
                      backgroundColor: currency === curr.code ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--secondary))'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{
                          backgroundColor: currency === curr.code ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                          color: currency === curr.code ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))'
                        }}
                      >
                        {curr.symbol}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{curr.code}</p>
                        <p className="text-sm text-muted-foreground">{curr.name}</p>
                      </div>
                    </div>

                    {currency === curr.code && (
                      <Check className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
