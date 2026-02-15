"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { Instagram, Twitter, Youtube, Mail, MapPin, Phone, Shield, Truck, RotateCcw, Headset, CreditCard, ChevronUp } from "lucide-react"
import { useState } from "react"

export default function Footer() {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubscribed(true)
      setEmail("")
      setTimeout(() => setSubscribed(false), 3000)
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer
      className="relative hidden md:block"
      style={{
        background: 'linear-gradient(to bottom, oklch(0.10 0.03 280), oklch(0.08 0.02 280))',
        borderTop: '1px solid oklch(1 0 0 / 0.06)',
      }}
    >
      {/* Back to top */}
      <button
        onClick={scrollToTop}
        className="w-full py-2.5 text-center text-sm font-medium transition-all hover:opacity-80"
        style={{
          background: 'oklch(1 0 0 / 0.04)',
          color: 'oklch(0.70 0.03 280)',
        }}
      >
        <ChevronUp className="w-4 h-4 inline mr-1" />
        Nach oben
      </button>

      {/* Advantage bar */}
      <div
        className="py-6 px-4"
        style={{
          background: 'oklch(1 0 0 / 0.03)',
          borderBottom: '1px solid oklch(1 0 0 / 0.05)',
        }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Truck, title: "Kostenloser Versand", sub: "Ab 50€ Bestellwert" },
            { icon: RotateCcw, title: "14 Tage Rückgabe", sub: "Einfach & kostenlos" },
            { icon: Shield, title: "Käuferschutz", sub: "100% sicher einkaufen" },
            { icon: Headset, title: "24/7 Support", sub: "Immer für Sie da" },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'oklch(0.78 0.14 85 / 0.1)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'oklch(0.78 0.14 85)' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'oklch(0.90 0.02 85)' }}>{item.title}</p>
                  <p className="text-[10px]" style={{ color: 'oklch(0.50 0.03 280)' }}>{item.sub}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main footer content */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3
              className="font-serif text-2xl font-bold mb-3"
              style={{
                background: 'linear-gradient(135deg, oklch(0.85 0.12 85), oklch(0.78 0.14 85))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Wearo
            </h3>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'oklch(0.50 0.03 280)' }}>
              KI-gestützte Mode- und Stilplattform. Entdecken Sie kuratierte Kollektionen von Premium-Händlern.
            </p>
            <div className="flex gap-2">
              {[
                { icon: Instagram, href: "#" },
                { icon: Twitter, href: "#" },
                { icon: Youtube, href: "#" },
              ].map((s, i) => {
                const Icon = s.icon
                return (
                  <a
                    key={i}
                    href={s.href}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: 'oklch(1 0 0 / 0.06)',
                      border: '1px solid oklch(1 0 0 / 0.08)',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: 'oklch(0.65 0.03 280)' }} />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Einkaufen */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'oklch(0.78 0.14 85)' }}>
              Einkaufen
            </h4>
            <ul className="space-y-2">
              {[
                { label: "Alle Produkte", href: "/store" },
                { label: "Neue Artikel", href: "/store?sort=newest" },
                { label: "Bestseller", href: "/store?sort=popular" },
                { label: "Outfit-Kollektionen", href: "/outfits" },
                { label: "Sale", href: "/store?sale=true" },
              ].map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="text-xs transition-colors hover:opacity-80" style={{ color: 'oklch(0.55 0.03 280)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Unternehmen */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'oklch(0.78 0.14 85)' }}>
              Unternehmen
            </h4>
            <ul className="space-y-2">
              {[
                { label: "Über uns", href: "/about" },
                { label: "Karriere", href: "/careers" },
                { label: "Verkäufer werden", href: "/seller-application" },
                { label: "Presse", href: "/press" },
                { label: "Blog", href: "/blog" },
              ].map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="text-xs transition-colors hover:opacity-80" style={{ color: 'oklch(0.55 0.03 280)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Rechtliches */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'oklch(0.78 0.14 85)' }}>
              Rechtliches
            </h4>
            <ul className="space-y-2">
              {[
                { label: "Datenschutz (DSGVO)", href: "/legal/privacy" },
                { label: "AGB", href: "/legal/agb" },
                { label: "Impressum", href: "/legal/impressum" },
                { label: "Widerrufsrecht", href: "/legal/widerrufsrecht" },
                { label: "Cookie-Richtlinie", href: "/legal/cookies" },
              ].map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="text-xs transition-colors hover:opacity-80" style={{ color: 'oklch(0.55 0.03 280)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'oklch(0.78 0.14 85)' }}>
              Newsletter
            </h4>
            <p className="text-[10px] mb-3" style={{ color: 'oklch(0.50 0.03 280)' }}>
              Erhalten Sie exklusive Angebote und Neuigkeiten.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-1.5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-Mail"
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none min-w-0"
                style={{
                  background: 'oklch(1 0 0 / 0.06)',
                  border: '1px solid oklch(1 0 0 / 0.08)',
                  color: 'oklch(0.90 0.02 85)',
                }}
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.65 0.18 50))',
                  color: 'white',
                }}
              >
                <Mail className="w-3.5 h-3.5" />
              </button>
            </form>
            {subscribed && (
              <p className="text-[10px] mt-1.5" style={{ color: 'oklch(0.60 0.20 145)' }}>
                Erfolgreich abonniert!
              </p>
            )}

            {/* Payment methods */}
            <div className="mt-4">
              <p className="text-[10px] mb-2" style={{ color: 'oklch(0.45 0.03 280)' }}>Zahlungsmethoden</p>
              <div className="flex gap-1.5">
                {["Visa", "MC", "PayPal", "Klarna"].map((m, i) => (
                  <div
                    key={i}
                    className="px-2 py-1 rounded text-[9px] font-bold"
                    style={{
                      background: 'oklch(1 0 0 / 0.06)',
                      border: '1px solid oklch(1 0 0 / 0.08)',
                      color: 'oklch(0.60 0.03 280)',
                    }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="px-4 py-4"
        style={{
          borderTop: '1px solid oklch(1 0 0 / 0.05)',
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-[10px]" style={{ color: 'oklch(0.40 0.03 280)' }}>
            © {new Date().getFullYear()} Wearo. Alle Rechte vorbehalten.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" style={{ color: 'oklch(0.50 0.03 280)' }} />
              <span className="text-[9px]" style={{ color: 'oklch(0.45 0.03 280)' }}>SSL verschlüsselt</span>
            </div>
            <div className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" style={{ color: 'oklch(0.50 0.03 280)' }} />
              <span className="text-[9px]" style={{ color: 'oklch(0.45 0.03 280)' }}>Sichere Zahlung</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" style={{ color: 'oklch(0.50 0.03 280)' }} />
              <span className="text-[9px]" style={{ color: 'oklch(0.45 0.03 280)' }}>Deutschland</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
