"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

interface SellerApplicationData {
  // Step 1: Persönliche Daten / Kişisel Bilgiler
  fullName: string
  phone: string
  email: string
  address: string
  city: string
  postalCode: string
  country: string

  // Step 2: Geschäftsinformationen / Mağaza Bilgileri
  shopName: string
  shopDescription: string
  businessType: 'einzelunternehmer' | 'GmbH' | 'UG' | 'e.K.' | 'individual' | 'company' | string // Almanya'ya özel iş türleri

  // Step 3: Bank & Steuer / Banka & Vergi
  iban: string
  bic: string // BIC/SWIFT code (Almanya'da gerekli)
  bankName: string
  accountHolderName: string
  steuernummer: string // Alman vergi numarası (11 haneli)
  ustIdNr: string // USt-IdNr (KDV numarası - opsiyonel)
  finanzamt: string // Bağlı olduğu vergi dairesi
  kleinunternehmer: boolean // Kleinunternehmerregelung (§19 UStG) - KDV muafiyeti

  // Step 4: Dokumente / Belgeler (URLs)
  personalausweisVorderseite: string // Personalausweis Vorderseite
  personalausweisRückseite: string // Personalausweis Rückseite
  meldebescheinigung: string // Meldebescheinigung (Adres tescil belgesi)
  gewerbeschein: string // Gewerbeschein (Ticaret ruhsatı - gerekli!)
  handelsregisterauszug: string // Handelsregisterauszug (GmbH/UG için)
  logoUrl: string
  taxNumber?: string
  vatNumber?: string
  idCardFrontUrl?: string
  idCardBackUrl?: string
  addressDocumentUrl?: string
  businessCertificateUrl?: string
}

interface SellerApplicationContextType {
  formData: SellerApplicationData
  updateFormData: (data: Partial<SellerApplicationData>) => void
  resetFormData: () => void
}

const defaultFormData: SellerApplicationData = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'Deutschland',
  shopName: '',
  shopDescription: '',
  businessType: 'einzelunternehmer',
  iban: '',
  bic: '',
  bankName: '',
  accountHolderName: '',
  steuernummer: '',
  ustIdNr: '',
  finanzamt: '',
  kleinunternehmer: false,
  personalausweisVorderseite: '',
  personalausweisRückseite: '',
  meldebescheinigung: '',
  gewerbeschein: '',
  handelsregisterauszug: '',
  logoUrl: ''
}

const SellerApplicationContext = createContext<SellerApplicationContextType | undefined>(undefined)

export function SellerApplicationProvider({ children }: { children: ReactNode }) {
  const [formData, setFormData] = useState<SellerApplicationData>(defaultFormData)

  const updateFormData = (data: Partial<SellerApplicationData>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  const resetFormData = () => {
    setFormData(defaultFormData)
  }

  return (
    <SellerApplicationContext.Provider value={{ formData, updateFormData, resetFormData }}>
      {children}
    </SellerApplicationContext.Provider>
  )
}

export function useSellerApplication() {
  const context = useContext(SellerApplicationContext)
  if (!context) {
    throw new Error('useSellerApplication must be used within SellerApplicationProvider')
  }
  return context
}
