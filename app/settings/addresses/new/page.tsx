"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function NewAddressPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    label: 'Home',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country_code: 'DE',
    is_default: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    setIsSaving(true)

    try {
      // If setting as default, unset all others first
      if (formData.is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', session.user.id)
      }

      // Insert new address
      const { error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: session.user.id,
          ...formData
        })

      if (error) throw error

      router.push('/settings/addresses')
    } catch (error) {
      console.error('Error saving address:', error)
      alert('Failed to save address')
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
          <h1 className="text-xl font-bold flex-1">Add Address</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="text-sm font-medium mb-2 block">Label</label>
          <div className="flex gap-2">
            {['Home', 'Work', 'Other'].map(label => (
              <button
                key={label}
                type="button"
                onClick={() => updateField('label', label)}
                className={`flex-1 h-10 rounded-xl font-medium tap-highlight-none transition-colors ${
                  formData.label === label
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="text-sm font-medium mb-2 block">Full Name</label>
          <input
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
            className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="John Doe"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-sm font-medium mb-2 block">Phone</label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="+49 123 456 789"
          />
        </div>

        {/* Address Line 1 */}
        <div>
          <label className="text-sm font-medium mb-2 block">Street Address</label>
          <input
            type="text"
            required
            value={formData.address_line1}
            onChange={(e) => updateField('address_line1', e.target.value)}
            className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Bergmannstr. 12"
          />
        </div>

        {/* Address Line 2 */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Apartment, suite, etc. (optional)
          </label>
          <input
            type="text"
            value={formData.address_line2}
            onChange={(e) => updateField('address_line2', e.target.value)}
            className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Apt 4B"
          />
        </div>

        {/* City */}
        <div>
          <label className="text-sm font-medium mb-2 block">City</label>
          <input
            type="text"
            required
            value={formData.city}
            onChange={(e) => updateField('city', e.target.value)}
            className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Berlin"
          />
        </div>

        {/* State & Postal Code */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">State/Region</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
              className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Berlin"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Postal Code</label>
            <input
              type="text"
              required
              value={formData.postal_code}
              onChange={(e) => updateField('postal_code', e.target.value)}
              className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="10961"
            />
          </div>
        </div>

        {/* Country */}
        <div>
          <label className="text-sm font-medium mb-2 block">Country</label>
          <select
            value={formData.country_code}
            onChange={(e) => updateField('country_code', e.target.value)}
            className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="DE">Germany</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="TR">Turkey</option>
            <option value="FR">France</option>
            <option value="IT">Italy</option>
            <option value="ES">Spain</option>
          </select>
        </div>

        {/* Set as default */}
        <label className="flex items-center gap-3 p-4 bg-secondary rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_default}
            onChange={(e) => updateField('is_default', e.target.checked)}
            className="w-5 h-5 rounded border-2 border-primary"
          />
          <div className="flex-1">
            <p className="font-medium">Set as default shipping address</p>
            <p className="text-sm text-muted-foreground">
              Use this address for express checkout
            </p>
          </div>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 tap-highlight-none active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Address</span>
          )}
        </button>
      </form>
    </div>
  )
}
