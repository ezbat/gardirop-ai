"use client"

import { useState, useEffect } from "react"
import { X, Cookie } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export default function CookieConsent() {
  const { t } = useLanguage()
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      // Show banner after 1 second delay
      const timer = setTimeout(() => {
        setShowBanner(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setShowBanner(false)
  }

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="container mx-auto max-w-6xl">
        <div className="glass border border-border rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Cookie className="w-6 h-6 text-primary" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">{t('cookieConsentTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('cookieConsentMessage')}{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  {t('privacyPolicy')}
                </Link>
                {' '}{t('and')}{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  {t('termsOfService')}
                </Link>
                .
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button
                onClick={declineCookies}
                className="px-4 py-2 rounded-xl border border-border hover:bg-secondary/50 transition-colors text-sm"
              >
                {t('declineCookies')}
              </button>
              <button
                onClick={acceptCookies}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold text-sm"
              >
                {t('acceptCookies')}
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={declineCookies}
              className="absolute top-4 right-4 md:relative md:top-0 md:right-0 p-1 hover:bg-secondary/50 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
