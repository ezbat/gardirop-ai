'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, X, Sparkles, Zap, Crown, Building2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PLANS, PLAN_ORDER, type PlanId, type PlanDefinition } from '@/lib/plans'

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const canceled = searchParams.get('canceled')

  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<PlanId | null>(null)

  const planIcons: Record<PlanId, React.ReactNode> = {
    starter: <Sparkles className="w-6 h-6" />,
    creator: <Zap className="w-6 h-6" />,
    pro: <Crown className="w-6 h-6" />,
    brand: <Building2 className="w-6 h-6" />,
  }

  const planAccents: Record<PlanId, string> = {
    starter: 'border-zinc-700',
    creator: 'border-amber-500 ring-1 ring-amber-500/20',
    pro: 'border-violet-500 ring-1 ring-violet-500/20',
    brand: 'border-emerald-500 ring-1 ring-emerald-500/20',
  }

  const ctaColors: Record<PlanId, string> = {
    starter: 'bg-zinc-700 hover:bg-zinc-600 text-white',
    creator: 'bg-amber-600 hover:bg-amber-500 text-white',
    pro: 'bg-violet-600 hover:bg-violet-500 text-white',
    brand: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  }

  async function handleSubscribe(planId: PlanId) {
    if (planId === 'starter') return
    if (!session?.user) {
      router.push('/auth/signin?callbackUrl=/pricing')
      return
    }
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('[pricing] No URL returned:', data)
        setLoading(null)
      }
    } catch (err) {
      console.error('[pricing] Subscribe error:', err)
      setLoading(null)
    }
  }

  function getPrice(plan: PlanDefinition) {
    if (plan.monthlyPrice === 0) return { display: '0', period: '' }
    if (interval === 'yearly') {
      const monthly = Math.round(plan.yearlyPrice / 12)
      return { display: `${monthly}`, period: '/mo' }
    }
    return { display: `${plan.monthlyPrice}`, period: '/mo' }
  }

  function getSavings(plan: PlanDefinition) {
    if (plan.monthlyPrice === 0) return null
    const yearlyMonthly = Math.round(plan.yearlyPrice / 12)
    const saved = plan.monthlyPrice - yearlyMonthly
    if (saved <= 0) return null
    return saved
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] text-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>
      </div>

      {/* Hero */}
      <div className="text-center px-4 pt-4 pb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
          Dein Store. Deine Regeln.
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-8">
          Starte kostenlos und upgrade, wenn du wächst. Keine versteckten Kosten — nur faire Konditionen für Creators.
        </p>

        {canceled && (
          <div className="inline-block bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm px-4 py-2 rounded-lg mb-6">
            Zahlung abgebrochen — du kannst jederzeit erneut starten.
          </div>
        )}

        {/* Interval Toggle */}
        <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 rounded-full p-1 gap-1">
          <button
            onClick={() => setInterval('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition ${
              interval === 'monthly' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Monatlich
          </button>
          <button
            onClick={() => setInterval('yearly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition ${
              interval === 'yearly' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Jährlich
            <span className="ml-2 text-xs text-emerald-400">Spare bis zu 17%</span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId]
            const price = getPrice(plan)
            const savings = interval === 'yearly' ? getSavings(plan) : null

            return (
              <div
                key={planId}
                className={`relative bg-zinc-900/80 border rounded-2xl p-6 flex flex-col ${planAccents[planId]} ${
                  plan.recommended ? 'scale-[1.02] sm:scale-105' : ''
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                    Empfohlen
                  </div>
                )}

                {/* Plan Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-zinc-400">{planIcons[planId]}</div>
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                  </div>
                </div>

                <p className="text-sm text-zinc-400 mb-6">{plan.tagline}</p>

                {/* Price */}
                <div className="mb-6">
                  {plan.monthlyPrice === 0 ? (
                    <div className="text-3xl font-bold">Kostenlos</div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">€{price.display}</span>
                      <span className="text-zinc-400 text-sm">{price.period}</span>
                    </div>
                  )}
                  {savings && (
                    <p className="text-emerald-400 text-xs mt-1">
                      Spare €{savings}/mo vs. monatlich
                    </p>
                  )}
                  <p className="text-zinc-500 text-xs mt-1">
                    {plan.commissionRate}% Provision pro Verkauf
                  </p>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(planId)}
                  disabled={planId === 'starter' || loading === planId}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${ctaColors[planId]} mb-6`}
                >
                  {loading === planId
                    ? 'Wird geladen...'
                    : planId === 'starter'
                    ? 'Aktueller Plan'
                    : `${plan.name} wählen`}
                </button>

                {/* Features */}
                <div className="flex-1 space-y-3 text-sm">
                  <FeatureLine included>
                    {plan.limits.maxProducts === -1 ? 'Unbegrenzte' : `Bis zu ${plan.limits.maxProducts}`} Produkte
                  </FeatureLine>
                  <FeatureLine included>
                    {plan.limits.maxImages} Bilder pro Produkt
                  </FeatureLine>
                  <FeatureLine included>
                    {plan.limits.maxOutfits === -1 ? 'Unbegrenzte' : `${plan.limits.maxOutfits}`} Outfits
                  </FeatureLine>
                  <FeatureLine included={plan.features.customTheme}>Store-Theme</FeatureLine>
                  <FeatureLine included={plan.features.customAccent}>Eigene Akzentfarbe</FeatureLine>
                  <FeatureLine included={plan.features.customTypography}>Eigene Schriftart</FeatureLine>
                  <FeatureLine included={plan.features.customHeroBanner}>Hero-Banner</FeatureLine>
                  <FeatureLine included={plan.features.removeBranding}>Branding entfernen</FeatureLine>
                  <FeatureLine included={plan.features.verifiedBadge}>Verifiziertes Badge</FeatureLine>
                  <FeatureLine included={plan.features.prioritySupport}>Prioritäts-Support</FeatureLine>
                  <FeatureLine included={plan.features.customDomain}>Eigene Domain</FeatureLine>
                  <FeatureLine included={plan.features.apiAccess}>API-Zugang</FeatureLine>
                </div>
              </div>
            )
          })}
        </div>

        {/* FAQ / Trust */}
        <div className="mt-20 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Häufige Fragen</h2>
          <div className="space-y-6 text-left">
            <FaqItem
              q="Kann ich jederzeit kündigen?"
              a="Ja, du kannst dein Abo jederzeit kündigen. Dein Plan bleibt bis zum Ende der Laufzeit aktiv."
            />
            <FaqItem
              q="Was passiert mit meinen Produkten beim Downgrade?"
              a="Deine Produkte bleiben erhalten. Wenn du das Limit überschreitest, kannst du keine neuen hinzufügen, bis du wieder im Limit bist."
            />
            <FaqItem
              q="Wie funktioniert die Provision?"
              a="Bei jedem Verkauf wird ein kleiner Prozentsatz als Plattform-Provision abgezogen. Je höher dein Plan, desto niedriger die Provision."
            />
            <FaqItem
              q="Gibt es eine Testphase?"
              a="Der Starter-Plan ist dauerhaft kostenlos. Du kannst alle Basis-Features ohne Zeitlimit nutzen."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureLine({ included, children }: { included: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2 ${included ? 'text-zinc-200' : 'text-zinc-600 line-through'}`}>
      {included ? (
        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      ) : (
        <X className="w-4 h-4 text-zinc-700 flex-shrink-0" />
      )}
      <span>{children}</span>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
      <h3 className="font-semibold text-white mb-2">{q}</h3>
      <p className="text-sm text-zinc-400">{a}</p>
    </div>
  )
}
