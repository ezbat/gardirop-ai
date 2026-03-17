"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { ChevronUp, Shield, CreditCard, MapPin, Truck } from "lucide-react"

export default function Footer() {
  const { t } = useLanguage()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="relative hidden md:block">
      {/* Back to top — Amazon style */}
      <button
        onClick={scrollToTop}
        className="w-full py-[10px] text-center text-[13px] font-medium"
        style={{
          background: '#232F3E',
          color: '#CCCCCC',
          transition: 'background 200ms',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#2A3849')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#232F3E')}
      >
        <ChevronUp className="w-[14px] h-[14px] inline mr-[4px]" />
        Nach oben
      </button>

      {/* Main footer — Dark navy (matches header) */}
      <div
        style={{
          background: '#131921',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-7xl mx-auto px-[48px] py-[48px]">
          <div className="grid grid-cols-4 gap-[40px]">
            {/* Col 1 — Einkaufen */}
            <div>
              <h4
                className="text-[13px] font-semibold mb-[16px]"
                style={{ color: '#FFFFFF' }}
              >
                Einkaufen
              </h4>
              <ul className="space-y-[10px]">
                {[
                  { label: 'Alle Produkte', href: '/store' },
                  { label: 'Neuheiten', href: '/store' },
                  { label: 'Bestseller', href: '/store' },
                  { label: 'Outfit-Kollektionen', href: '/outfits' },
                  { label: 'Flash Deals', href: '/store' },
                  { label: 'Reels', href: '/reels' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px]"
                      style={{ color: '#999999', transition: 'color 200ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#D97706')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#999999')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 2 — Ihr Konto */}
            <div>
              <h4
                className="text-[13px] font-semibold mb-[16px]"
                style={{ color: '#FFFFFF' }}
              >
                Ihr Konto
              </h4>
              <ul className="space-y-[10px]">
                {[
                  { label: 'Mein Konto', href: '/profile' },
                  { label: 'Bestellungen', href: '/orders' },
                  { label: 'Merkliste', href: '/wishlist' },
                  { label: 'Warenkorb', href: '/cart' },
                  { label: 'Verkäufer werden', href: '/seller-application' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px]"
                      style={{ color: '#999999', transition: 'color 200ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#D97706')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#999999')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 — Hilfe & Rechtliches */}
            <div>
              <h4
                className="text-[13px] font-semibold mb-[16px]"
                style={{ color: '#FFFFFF' }}
              >
                Hilfe & Rechtliches
              </h4>
              <ul className="space-y-[10px]">
                {[
                  { label: 'Datenschutz (DSGVO)', href: '/legal/privacy' },
                  { label: 'AGB', href: '/legal/agb' },
                  { label: 'Impressum', href: '/legal/impressum' },
                  { label: 'Widerrufsrecht', href: '/legal/widerrufsrecht' },
                  { label: 'Cookie-Richtlinie', href: '/legal/cookies' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px]"
                      style={{ color: '#999999', transition: 'color 200ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#D97706')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#999999')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4 — Über WEARO */}
            <div>
              <h4
                className="text-[13px] font-semibold mb-[16px]"
                style={{ color: '#FFFFFF' }}
              >
                Über WEARO
              </h4>
              <ul className="space-y-[10px]">
                {[
                  { label: 'Über uns', href: '/about' },
                  { label: 'Karriere', href: '/careers' },
                  { label: 'Presse', href: '/press' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'Nachhaltigkeit', href: '/sustainability' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px]"
                      style={{ color: '#999999', transition: 'color 200ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#D97706')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#999999')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Payment methods + trust */}
          <div
            className="mt-[40px] pt-[24px]"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[11px] mb-[10px]" style={{ color: '#777777' }}>Zahlungsmethoden</p>
            <div className="flex gap-[8px]">
              {['Visa', 'Mastercard', 'PayPal', 'Klarna', 'Apple Pay', 'Google Pay'].map((m) => (
                <div
                  key={m}
                  className="px-[10px] py-[5px] rounded-[4px] text-[10px] font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#BBBBBB',
                  }}
                >
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar — darkest */}
      <div
        className="px-[48px] py-[14px]"
        style={{
          background: '#0C1017',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-[16px]">
            <span
              className="text-[16px] uppercase font-bold"
              style={{ letterSpacing: '0.1em', color: '#FFFFFF' }}
            >
              WEARO
            </span>
            <span className="text-[11px]" style={{ color: '#777777' }}>
              {new Date().getFullYear()} Alle Rechte vorbehalten.
            </span>
          </div>
          <div className="flex items-center gap-[16px]">
            <div className="flex items-center gap-[4px]">
              <Shield className="w-[12px] h-[12px]" style={{ color: '#777777' }} />
              <span className="text-[10px]" style={{ color: '#777777' }}>SSL-verschlüsselt</span>
            </div>
            <div className="flex items-center gap-[4px]">
              <CreditCard className="w-[12px] h-[12px]" style={{ color: '#777777' }} />
              <span className="text-[10px]" style={{ color: '#777777' }}>Sichere Zahlung</span>
            </div>
            <div className="flex items-center gap-[4px]">
              <Truck className="w-[12px] h-[12px]" style={{ color: '#777777' }} />
              <span className="text-[10px]" style={{ color: '#777777' }}>Schneller Versand</span>
            </div>
            <div className="flex items-center gap-[4px]">
              <MapPin className="w-[12px] h-[12px]" style={{ color: '#777777' }} />
              <span className="text-[10px]" style={{ color: '#777777' }}>Deutschland</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
