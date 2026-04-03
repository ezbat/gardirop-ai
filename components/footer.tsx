"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronUp, Shield, CreditCard, MapPin, Truck } from "lucide-react"

export default function Footer() {
  const pathname = usePathname()

  // Hide footer on admin, auth, onboarding, seller paths
  const hiddenPaths = ['/admin', '/auth', '/onboarding', '/seller']
  if (hiddenPaths.some(p => pathname?.startsWith(p))) return null

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="relative">
      {/* Back to top */}
      <button
        onClick={scrollToTop}
        className="w-full py-3 text-center text-[13px] font-medium"
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

      {/* Main footer */}
      <div style={{ background: '#131921', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
            {/* Col 1 — Einkaufen */}
            <div>
              <h4 className="text-[13px] font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                Einkaufen
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Alle Produkte', href: '/explore' },
                  { label: 'Neuheiten', href: '/explore' },
                  { label: 'Kategorien', href: '/categories' },
                  { label: 'Outfit-Kollektionen', href: '/explore' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[13px] hover:text-[#D97706] transition-colors"
                      style={{ color: '#999999' }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 2 — Ihr Konto */}
            <div>
              <h4 className="text-[13px] font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                Ihr Konto
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Mein Konto', href: '/profile' },
                  { label: 'Bestellungen', href: '/orders' },
                  { label: 'Warenkorb', href: '/cart' },
                  { label: 'Verkäufer werden', href: '/sell/apply' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[13px] hover:text-[#D97706] transition-colors"
                      style={{ color: '#999999' }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 — Hilfe & Rechtliches */}
            <div>
              <h4 className="text-[13px] font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                Hilfe & Rechtliches
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Datenschutz (DSGVO)', href: '/legal/privacy' },
                  { label: 'AGB', href: '/legal/agb' },
                  { label: 'Impressum', href: '/legal/impressum' },
                  { label: 'Widerrufsrecht', href: '/legal/widerrufsrecht' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[13px] hover:text-[#D97706] transition-colors"
                      style={{ color: '#999999' }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4 — Über WEARO */}
            <div>
              <h4 className="text-[13px] font-semibold mb-4" style={{ color: '#FFFFFF' }}>
                Über WEARO
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Über uns', href: '/about' },
                  { label: 'Kontakt', href: '/support' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[13px] hover:text-[#D97706] transition-colors"
                      style={{ color: '#999999' }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Payment methods */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[11px] mb-2.5" style={{ color: '#AAAAAA' }}>Zahlungsmethoden</p>
            <div className="flex flex-wrap gap-2">
              {['Visa', 'Mastercard', 'PayPal', 'Klarna', 'Apple Pay', 'Google Pay'].map((m) => (
                <div key={m} className="px-2.5 py-1 rounded text-[10px] font-medium"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#DDDDDD' }}>
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-4 sm:px-6 lg:px-12 py-3"
        style={{ background: '#0C1017', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="text-[16px] uppercase font-bold" style={{ letterSpacing: '0.1em', color: '#FFFFFF' }}>
              WEARO
            </span>
            <span className="text-[11px]" style={{ color: '#AAAAAA' }}>
              {new Date().getFullYear()} Alle Rechte vorbehalten.
            </span>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" style={{ color: '#AAAAAA' }} />
              <span className="text-[10px]" style={{ color: '#AAAAAA' }}>SSL-verschlüsselt</span>
            </div>
            <div className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" style={{ color: '#AAAAAA' }} />
              <span className="text-[10px]" style={{ color: '#AAAAAA' }}>Sichere Zahlung</span>
            </div>
            <div className="flex items-center gap-1 hidden sm:flex">
              <Truck className="w-3 h-3" style={{ color: '#AAAAAA' }} />
              <span className="text-[10px]" style={{ color: '#AAAAAA' }}>Schneller Versand</span>
            </div>
            <div className="flex items-center gap-1 hidden sm:flex">
              <MapPin className="w-3 h-3" style={{ color: '#AAAAAA' }} />
              <span className="text-[10px]" style={{ color: '#AAAAAA' }}>Deutschland</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom spacer — prevents content from hiding behind mobile nav */}
      <div className="h-20 md:hidden" style={{ background: '#0C1017' }} />
    </footer>
  )
}
