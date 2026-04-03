'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Store,
  Link2,
  Palette,
  CreditCard,
  Share2,
  Shield,
  Zap,
  Heart,
  ChevronRight,
} from 'lucide-react'
import { StoreGrid } from '@/components/home/StoreGrid'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const prefersReduced = useReducedMotion()

  return (
    <div className="min-h-screen" style={{ background: '#0E0E10' }}>

      {/* ═══ 1. HERO ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(180deg, #0E0E10 0%, #1A1A1E 50%, #0E0E10 100%)',
        }} />
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none" style={{
          background: 'radial-gradient(ellipse, rgba(217,119,6,0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28 text-center">
          {/* Badge */}
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{
              background: 'rgba(217,119,6,0.08)',
              border: '1px solid rgba(217,119,6,0.15)',
            }}
          >
            <Store className="w-3.5 h-3.5" style={{ color: '#D97706' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#D97706' }}>
              Dein Store. Dein Link.
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-5"
            style={{ color: '#FFFFFF' }}
          >
            Dein Shop. Dein Link.{' '}
            <span style={{ color: '#D97706' }}>Dein Business.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Erstelle deinen eigenen Store in Minuten – ohne Code.
            <br className="hidden md:block" />
            Teile deinen Link und verkaufe direkt an deine Community.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/sell/apply"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold
                transition-all duration-200 hover:brightness-110 hover:shadow-lg active:scale-[0.98]"
              style={{
                background: '#D97706',
                color: '#FFFFFF',
                boxShadow: '0 4px 24px rgba(217,119,6,0.3)',
              }}
            >
              Jetzt starten
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold
                transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              Beispiel-Shop ansehen
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ 2. STORE GRID ═════════════════════════════════════════════════ */}
      <StoreGrid />

      {/* ═══ 3. FEATURES ═══════════════════════════════════════════════════ */}
      <section className="py-20" style={{ background: '#0E0E10' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.2em] block mb-2"
              style={{ color: '#D97706' }}
            >
              Alles was du brauchst
            </span>
            <h2 className="text-xl md:text-3xl font-bold text-white">
              Dein Store. Deine Regeln.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Link2,
                title: 'Bio-Link Store',
                desc: 'Ein Link für alles. Dein Store lebt auf deinem eigenen Link — teilbar überall.',
              },
              {
                icon: Share2,
                title: 'Social Commerce',
                desc: 'Poste, tagge Produkte, und verkaufe direkt über deinen Content.',
              },
              {
                icon: CreditCard,
                title: 'Built-in Payments',
                desc: 'Sichere Zahlungen via Stripe. Auszahlungen direkt auf dein Konto.',
              },
              {
                icon: Palette,
                title: 'Custom Themes',
                desc: 'Wähle aus Premium-Themes oder passe Farben und Layout individuell an.',
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(217,119,6,0.1)' }}
                >
                  <f.icon className="w-5 h-5" style={{ color: '#D97706' }} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4. HOW IT WORKS ═══════════════════════════════════════════════ */}
      <section className="py-20 relative overflow-hidden" style={{ background: '#0B0D14' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 30% 50%, rgba(217,119,6,0.03) 0%, transparent 60%)',
        }} />

        <div className="max-w-5xl mx-auto px-4 md:px-8 relative z-10">
          <div className="text-center mb-14">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.2em] block mb-2"
              style={{ color: '#D97706' }}
            >
              So einfach geht&apos;s
            </span>
            <h2 className="text-xl md:text-3xl font-bold text-white">
              In 3 Schritten zum eigenen Shop
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Account erstellen',
                desc: 'Registriere dich kostenlos und beantrage deinen Seller-Account.',
              },
              {
                step: '02',
                title: 'Shop anpassen',
                desc: 'Wähle dein Theme, lade Produkte hoch und gestalte deinen Store.',
              },
              {
                step: '03',
                title: 'Link teilen & verkaufen',
                desc: 'Teile deinen Shop-Link in Bio, Stories oder Nachrichten — und verdiene.',
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="relative rounded-2xl p-6 text-center"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Step number */}
                <div
                  className="text-3xl font-extrabold mb-4"
                  style={{ color: 'rgba(217,119,6,0.15)' }}
                >
                  {s.step}
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {s.desc}
                </p>

                {/* Connector arrow (not on last) */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 z-20">
                    <ChevronRight className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. TRUST ══════════════════════════════════════════════════════ */}
      <section className="py-16" style={{ background: '#0E0E10' }}>
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Shield,
                title: 'Sichere Zahlungen',
                desc: 'Stripe-powered. SSL-verschlüsselt. Käuferschutz inklusive.',
              },
              {
                icon: Zap,
                title: 'Schnelles Setup',
                desc: 'Dein Store ist in wenigen Minuten live — ohne technische Vorkenntnisse.',
              },
              {
                icon: Heart,
                title: 'Creator-first',
                desc: 'Gebaut für Creator, nicht für Konzerne. Faire Konditionen, volle Kontrolle.',
              },
            ].map((t, i) => (
              <motion.div
                key={t.title}
                initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="flex items-start gap-4 rounded-2xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(217,119,6,0.08)' }}
                >
                  <t.icon className="w-4 h-4" style={{ color: '#D97706' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-0.5">{t.title}</h3>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {t.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. FINAL CTA ══════════════════════════════════════════════════ */}
      <section className="py-20 relative overflow-hidden" style={{ background: '#0B0D14' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, rgba(217,119,6,0.05) 0%, transparent 55%)',
        }} />

        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              Starte deinen Shop{' '}
              <span style={{ color: '#D97706' }}>heute</span>
            </h2>
            <p
              className="text-sm mb-8 max-w-md mx-auto leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Kostenlos registrieren. Store erstellen. Sofort verkaufen.
              Keine monatlichen Gebühren im Starter-Plan.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sell/apply"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold
                  transition-all duration-200 hover:brightness-110 hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: '#D97706',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 24px rgba(217,119,6,0.3)',
                }}
              >
                Jetzt starten
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold
                  transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                Preise ansehen
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
