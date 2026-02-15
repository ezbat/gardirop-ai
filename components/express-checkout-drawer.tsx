"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, CreditCard, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import SwipeToConfirm from './swipe-to-confirm'
import { supabase } from '@/lib/supabase'

interface Product {
  id: string
  name: string
  price: number
  images: string[]
}

interface Address {
  id: string
  label: string
  full_name: string
  address_line1: string
  city: string
  postal_code: string
  country_code: string
}

interface ExpressCheckoutDrawerProps {
  isOpen: boolean
  onClose: () => void
  product: Product
  userId: string
}

export default function ExpressCheckoutDrawer({
  isOpen,
  onClose,
  product,
  userId
}: ExpressCheckoutDrawerProps) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null)
  const [isLoadingAddress, setIsLoadingAddress] = useState(true)

  useEffect(() => {
    if (isOpen && userId) {
      loadDefaultAddress()
    }
  }, [isOpen, userId])

  const loadDefaultAddress = async () => {
    setIsLoadingAddress(true)
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single()

      if (error) throw error
      setDefaultAddress(data)
    } catch (error) {
      console.error('Error loading address:', error)
    } finally {
      setIsLoadingAddress(false)
    }
  }

  const handlePurchase = async () => {
    // Simulate purchase process
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Create order logic here
    console.log('Order created:', {
      product: product.id,
      quantity,
      address: defaultAddress?.id,
      total: product.price * quantity
    })

    // Success - redirect to orders
    setTimeout(() => {
      onClose()
      router.push('/orders')
    }, 500)
  }

  const totalPrice = product.price * quantity

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 safe-area-bottom"
            style={{ maxHeight: '85vh' }}
          >
            {/* Handle */}
            <div className="bottom-sheet-handle" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-secondary tap-highlight-none"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: '75vh' }}>
              {/* Title */}
              <h2 className="text-2xl font-bold mb-6">Express Checkout</h2>

              {/* Product summary */}
              <div className="flex gap-4 mb-6 p-4 bg-secondary rounded-2xl">
                <img
                  src={product.images[0] || '/placeholder-product.png'}
                  alt={product.name}
                  className="w-20 h-20 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-bold text-primary mt-1">
                    ${product.price.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center tap-highlight-none active:scale-95 transition-transform"
                  >
                    <span className="text-xl font-bold">−</span>
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center tap-highlight-none active:scale-95 transition-transform"
                  >
                    <span className="text-xl font-bold">+</span>
                  </button>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Shipping Address</label>
                {isLoadingAddress ? (
                  <div className="p-4 bg-secondary rounded-2xl animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ) : defaultAddress ? (
                  <button
                    onClick={() => router.push('/settings/addresses')}
                    className="w-full p-4 bg-secondary rounded-2xl flex items-start gap-3 tap-highlight-none active:scale-[0.98] transition-transform text-left"
                  >
                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">{defaultAddress.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {defaultAddress.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {defaultAddress.address_line1}, {defaultAddress.city}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </button>
                ) : (
                  <button
                    onClick={() => router.push('/settings/addresses')}
                    className="w-full p-4 bg-secondary rounded-2xl border-2 border-dashed border-muted-foreground/30 tap-highlight-none"
                  >
                    <p className="text-sm font-medium">Add shipping address</p>
                  </button>
                )}
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Payment Method</label>
                <button className="w-full p-4 bg-secondary rounded-2xl flex items-center gap-3 tap-highlight-none active:scale-[0.98] transition-transform">
                  <CreditCard className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Visa •••• 1234</p>
                    <p className="text-sm text-muted-foreground">Default payment</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Total */}
              <div className="mb-6 p-4 bg-secondary rounded-2xl">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${(product.price * quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">$4.99</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-primary">
                      ${(totalPrice + 4.99).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Swipe to confirm */}
              <SwipeToConfirm
                onConfirm={handlePurchase}
                disabled={!defaultAddress}
                label="Kaydır Satın Al →"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
