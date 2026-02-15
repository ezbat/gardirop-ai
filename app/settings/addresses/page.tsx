"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Plus, MapPin, Check, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface Address {
  id: string
  label: string
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string
  city: string
  state?: string
  postal_code: string
  country_code: string
  is_default: boolean
}

export default function AddressesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      loadAddresses()
    }
  }, [session])

  const loadAddresses = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
    } catch (error) {
      console.error('Error loading addresses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setDefaultAddress = async (addressId: string) => {
    if (!session?.user?.id) return

    try {
      // Unset all defaults
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', session.user.id)

      // Set new default
      await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId)

      loadAddresses()
    } catch (error) {
      console.error('Error setting default:', error)
    }
  }

  const deleteAddress = async (addressId: string) => {
    if (!confirm('Delete this address?')) return

    try {
      await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)

      loadAddresses()
    } catch (error) {
      console.error('Error deleting address:', error)
    }
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen-mobile bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 safe-area-top">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center tap-highlight-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Shipping Addresses</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Add new button */}
        <button
          onClick={() => router.push('/settings/addresses/new')}
          className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 tap-highlight-none active:scale-[0.98] transition-transform"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Address</span>
        </button>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-secondary rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Address list */}
        {!isLoading && addresses.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">No addresses yet</p>
            <p className="text-muted-foreground">Add your first shipping address</p>
          </div>
        )}

        {addresses.map((address) => (
          <motion.div
            key={address.id}
            layout
            className="relative p-4 bg-secondary rounded-2xl"
          >
            {/* Default badge */}
            {address.is_default && (
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  <Check className="w-3 h-3" />
                  Default
                </span>
              </div>
            )}

            {/* Address info */}
            <div className="pr-20 mb-3">
              <p className="font-semibold mb-1">{address.label}</p>
              <p className="text-sm">{address.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {address.address_line1}
                {address.address_line2 && `, ${address.address_line2}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {address.city}, {address.postal_code}
              </p>
              <p className="text-sm text-muted-foreground">{address.phone}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {!address.is_default && (
                <button
                  onClick={() => setDefaultAddress(address.id)}
                  className="flex-1 h-10 rounded-xl bg-background text-sm font-medium tap-highlight-none active:scale-95 transition-transform"
                >
                  Set as Default
                </button>
              )}
              <button
                onClick={() => deleteAddress(address.id)}
                className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center tap-highlight-none active:scale-95 transition-transform"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
