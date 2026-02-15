"use client"

import { useLanguage } from '@/lib/language-context'
import { Rocket, Bell, ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface SellerComingSoonProps {
  title: string
  description: string
  icon: LucideIcon
  color: string
  estimatedDate?: string
}

export default function SellerComingSoon({ title, description, icon: Icon, color, estimatedDate }: SellerComingSoonProps) {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Icon Container */}
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div
            className="absolute inset-0 rounded-2xl opacity-20 blur-xl"
            style={{ background: color }}
          />
          <div
            className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
            style={{ background: `color-mix(in oklch, ${color} 15%, transparent)`, border: `1px solid color-mix(in oklch, ${color} 30%, transparent)` }}
          >
            <Icon className="w-10 h-10" style={{ color }} />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: color }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-3">{title}</h1>

        {/* Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: `color-mix(in oklch, ${color} 12%, transparent)`, border: `1px solid color-mix(in oklch, ${color} 25%, transparent)` }}>
          <Rocket className="w-4 h-4" style={{ color }} />
          <span className="text-sm font-semibold" style={{ color }}>{t('comingSoon') || 'Coming Soon'}</span>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-lg leading-relaxed mb-8">{description}</p>

        {/* Estimated Date */}
        {estimatedDate && (
          <p className="text-sm text-muted-foreground mb-8">
            {t('expectedLaunch') || 'Expected launch'}: <span className="font-semibold text-foreground">{estimatedDate}</span>
          </p>
        )}

        {/* Notify Button */}
        <button
          onClick={() => {/* Future: save interest */}}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 mb-6"
          style={{ background: color, color: '#fff' }}
        >
          <Bell className="w-4 h-4" />
          {t('notifyMe') || 'Notify me when ready'}
        </button>

        {/* Back Link */}
        <div>
          <Link
            href="/seller/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToDashboard') || 'Back to Command Center'}
          </Link>
        </div>
      </div>
    </div>
  )
}
