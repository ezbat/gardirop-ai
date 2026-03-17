'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight, ChevronDown, Check,
  Users, CreditCard, BarChart3, Shield, Headphones, Star,
  Package, Globe, Clock, FileCheck,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: Users,
    title: 'Große Reichweite',
    body: 'Deine Produkte werden von einem wachsenden Kundenstamm entdeckt, der aktiv kauft.',
    color: 'rgba(99,102,241,0.12)',
    iconColor: '#818CF8',
  },
  {
    icon: CreditCard,
    title: 'Zuverlässige Auszahlungen',
    body: 'Transparente Zahlungsabwicklung mit klaren Auszahlungszyklen — kein Finanzdurcheinander.',
    color: 'rgba(16,185,129,0.12)',
    iconColor: '#34D399',
  },
  {
    icon: BarChart3,
    title: 'Seller Dashboard',
    body: 'Bestellungen, Produkte, Einnahmen und Besucher auf einen Blick — alles zentral gesteuert.',
    color: 'rgba(245,158,11,0.12)',
    iconColor: '#FCD34D',
  },
  {
    icon: Shield,
    title: 'Sicherer Marktplatz',
    body: 'Käuferverifizierung und Plattformrichtlinien schützen sowohl Seller als auch Käufer.',
    color: 'rgba(239,68,68,0.12)',
    iconColor: '#FCA5A5',
  },
  {
    icon: Headphones,
    title: 'Persönlicher Support',
    body: 'Unser Seller-Support-Team hilft dir beim Onboarding und bei laufenden Fragen.',
    color: 'rgba(217,119,6,0.12)',
    iconColor: '#D97706',
  },
  {
    icon: Star,
    title: 'Verifizierter Status',
    body: 'Verifizierte Seller werden in Suchergebnissen hervorgehoben und erzielen höheres Vertrauen.',
    color: 'rgba(168,85,247,0.12)',
    iconColor: '#C084FC',
  },
]

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Bewerbung ausfüllen',
    body: 'Fülle das Bewerbungsformular in ca. 5–10 Minuten aus. Deine Angaben werden sicher gespeichert.',
    icon: FileCheck,
  },
  {
    step: 2,
    title: 'Prüfung & Rückmeldung',
    body: 'Unser Team prüft deine Bewerbung. Du erhältst innerhalb von 1–3 Werktagen eine Rückmeldung.',
    icon: Clock,
  },
  {
    step: 3,
    title: 'Verifikation abschließen',
    body: 'Je nach Kontotyp und Auszahlungsvolumen kann eine zusätzliche Identitäts- oder Unternehmensverifikation erforderlich sein.',
    icon: Shield,
  },
  {
    step: 4,
    title: 'Shop geht live',
    body: 'Richte deinen Shop ein, lade Produkte hoch und starte deine ersten Verkäufe.',
    icon: Globe,
  },
]

const FAQS = [
  {
    q: 'Wer kann sich als Seller bewerben?',
    a: 'Jede Privatperson (Einzelunternehmer/Freiberufler) oder registriertes Unternehmen aus EU/EWR-Ländern kann eine Bewerbung einreichen. Nicht-EU-Bewerber werden im Einzelfall geprüft.',
  },
  {
    q: 'Was ist der Unterschied zwischen einer Einzelperson und einem Unternehmen?',
    a: 'Einzelpersonen verkaufen unter ihrem eigenen Namen oder als Einzelunternehmer. Unternehmen verkaufen unter ihrer Firmen-/Handelsbezeichnung. Die Anforderungen an Identifikation und Verifizierung unterscheiden sich entsprechend.',
  },
  {
    q: 'Welche Produkte kann ich verkaufen?',
    a: 'Wir unterstützen eine breite Produktpalette — Mode, Elektronik, Haus & Küche, Beauty, Handmade und mehr. Produkte müssen den geltenden Gesetzen und unseren Plattformrichtlinien entsprechen. Verbotene Kategorien werden im Onboarding kommuniziert.',
  },
  {
    q: 'Wie funktioniert die Auszahlung?',
    a: 'Auszahlungen werden gemäß unserem Zahlungsplan durchgeführt. Vor der ersten Auszahlung kann je nach Zahlungsanbieter eine zusätzliche KYC-Prüfung erforderlich sein. Details werden nach der Genehmigung deiner Bewerbung mitgeteilt.',
  },
  {
    q: 'Wie lange dauert die Prüfung meiner Bewerbung?',
    a: 'In der Regel innerhalb von 1–3 Werktagen. In besonderen Fällen oder bei unvollständigen Angaben kann es länger dauern. Du wirst per E-Mail über den Status informiert.',
  },
  {
    q: 'Welche Informationen werden während der Bewerbung abgefragt?',
    a: 'Wir erfragen Kontaktdaten, Identitätsinformationen (Name, Land, ggf. Unternehmensdaten), Shop-Profil (Name, Kategorien, Beschreibung) sowie operative Angaben (Versandländer, Rücksendeadresse, Versandmodell). Diese Informationen werden ausschließlich für die Bewerbungsprüfung und das Onboarding verwendet.',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-xl overflow-hidden transition-shadow duration-200"
      style={{ border: '1px solid #E5E7EB', background: '#FFFFFF' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left
          hover:bg-gray-50 transition-colors duration-150 focus:outline-none
          focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl"
      >
        <span className="text-[15px] font-semibold" style={{ color: '#1A1A1A' }}>{q}</span>
        <ChevronDown
          className="w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200"
          style={{ color: '#9CA3AF', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-[14px] leading-relaxed" style={{ color: '#4B5563' }}>{a}</p>
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SellLandingPage() {
  return (
    <div style={{ background: '#FFFFFF' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)' }}
        className="relative overflow-hidden"
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
          <span
            className="inline-block px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full mb-6"
            style={{ background: 'rgba(217,119,6,0.18)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' }}
          >
            Seller-Programm
          </span>

          <h1 className="text-[40px] md:text-[60px] font-bold leading-tight text-white mb-5">
            Starte deinen Shop —{' '}
            <span style={{ color: '#D97706' }}>professionell</span>
            {' '}und transparent.
          </h1>

          <p
            className="text-[17px] md:text-[20px] max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: '#94A3B8' }}
          >
            Werde Seller-Partner und erreiche tausende von kaufbereiten Kunden.
            Fairer Bewerbungsprozess, sichere Zahlungsabwicklung und
            ein Dashboard, das mit deinem Geschäft mitwächst.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/sell/apply"
              className="inline-flex items-center gap-2 px-8 py-[14px] rounded-xl
                text-[15px] font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ background: '#D97706' }}
            >
              Jetzt bewerben
              <ChevronRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-6 py-[14px] rounded-xl
                text-[15px] font-medium transition-all duration-200 hover:bg-white/5"
              style={{ color: '#94A3B8', border: '1px solid rgba(148,163,184,0.2)' }}
            >
              Wie es funktioniert
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>

          <p className="mt-7 text-[13px]" style={{ color: '#475569' }}>
            Kostenlose Bewerbung · Keine versteckten Gebühren · Rückmeldung innerhalb von 3 Werktagen
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: '#F9FAFB' }} className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[28px] md:text-[34px] font-bold" style={{ color: '#1A1A1A' }}>
              So funktioniert die Bewerbung
            </h2>
            <p className="mt-3 text-[15px]" style={{ color: '#6B7280' }}>
              Von der Bewerbung bis zum ersten Verkauf — in vier klaren Schritten.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative">
            {/* Connector line — desktop only */}
            <div
              className="hidden md:block absolute top-[28px] left-[12.5%] right-[12.5%] h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, #E5E7EB 0%, #D97706 50%, #E5E7EB 100%)' }}
            />

            {HOW_IT_WORKS.map(({ step, title, body, icon: Icon }) => (
              <div
                key={step}
                className="relative flex flex-col items-center text-center p-5"
              >
                <div
                  className="w-[56px] h-[56px] rounded-full flex items-center justify-center
                    mb-4 relative z-10 text-[17px] font-bold text-white"
                  style={{ background: '#D97706', boxShadow: '0 0 0 4px #F9FAFB, 0 0 0 5px #D97706' }}
                >
                  {step}
                </div>
                <Icon className="w-5 h-5 mb-2" style={{ color: '#D97706' }} />
                <h3 className="text-[15px] font-bold mb-2" style={{ color: '#1A1A1A' }}>{title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: '#6B7280' }}>{body}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/sell/apply"
              className="inline-flex items-center gap-2 px-8 py-[13px] rounded-xl
                text-[14px] font-bold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: '#D97706' }}
            >
              Bewerbung starten
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[28px] md:text-[34px] font-bold" style={{ color: '#1A1A1A' }}>
              Warum als Seller bei uns?
            </h2>
            <p className="mt-3 text-[15px]" style={{ color: '#6B7280' }}>
              Alles, was du brauchst, um deinen Online-Handel erfolgreich aufzubauen.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map(({ icon: Icon, title, body, color, iconColor }) => (
              <div
                key={title}
                className="rounded-xl p-6 transition-shadow duration-200 hover:shadow-md"
                style={{ border: '1px solid #F0F0F0', background: '#FFFFFF' }}
              >
                <div
                  className="w-[44px] h-[44px] rounded-xl flex items-center justify-center mb-4"
                  style={{ background: color }}
                >
                  <Icon className="w-5 h-5" style={{ color: iconColor }} />
                </div>
                <h3 className="text-[15px] font-bold mb-2" style={{ color: '#1A1A1A' }}>{title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: '#6B7280' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20" style={{ background: '#F9FAFB' }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-[28px] md:text-[34px] font-bold" style={{ color: '#1A1A1A' }}>
              Häufig gestellte Fragen
            </h2>
            <p className="mt-3 text-[15px]" style={{ color: '#6B7280' }}>
              Alles, was du zur Seller-Bewerbung wissen solltest.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust & Transparency notice ───────────────────────────────────── */}
      <section className="py-14 md:py-16" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div
            className="rounded-2xl px-8 py-8 flex flex-col md:flex-row gap-8 items-start"
            style={{ background: '#FFFBEB', border: '1px solid rgba(217,119,6,0.2)' }}
          >
            <div className="flex-shrink-0">
              <Shield className="w-10 h-10" style={{ color: '#D97706' }} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold mb-3" style={{ color: '#1A1A1A' }}>
                Transparente Bewerbung — keine Überraschungen
              </h3>
              <div className="space-y-2 text-[14px] leading-relaxed" style={{ color: '#4B5563' }}>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
                  Deine Angaben werden ausschließlich zur Prüfung deiner Bewerbung und zur
                  Einrichtung deines Seller-Kontos verwendet — nie für Werbung verkauft.
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
                  Wir können je nach Kontotyp und Auszahlungsvolumen zusätzliche
                  Informationen zur Identitäts- oder Unternehmensverifizierung anfordern.
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
                  Eingereichte Informationen werden gemäß unserer{' '}
                  <a
                    href="/privacy"
                    className="underline underline-offset-2 hover:opacity-80"
                    style={{ color: '#D97706' }}
                  >
                    Datenschutzrichtlinie
                  </a>{' '}
                  {/* TODO: replace /privacy with actual privacy page URL */}
                  behandelt.
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
                  Alle eingereichten Bewerbungen werden manuell geprüft. Eine Genehmigung ist
                  keine automatische Garantie.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section
        className="py-16 md:py-20"
        style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E293B 100%)' }}
      >
        <div className="max-w-2xl mx-auto px-6 text-center">
          <Package className="w-10 h-10 mx-auto mb-5" style={{ color: '#D97706' }} />
          <h2 className="text-[28px] md:text-[36px] font-bold text-white mb-4">
            Bereit, deinen Shop zu starten?
          </h2>
          <p className="text-[16px] mb-8" style={{ color: '#94A3B8' }}>
            Starte jetzt deine kostenlose Bewerbung. Unser Team meldet sich
            innerhalb von 1–3 Werktagen bei dir.
          </p>
          <Link
            href="/sell/apply"
            className="inline-flex items-center gap-2 px-10 py-[14px] rounded-xl
              text-[15px] font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#D97706' }}
          >
            Jetzt bewerben
            <ChevronRight className="w-4 h-4" />
          </Link>
          <p className="mt-4 text-[12px]" style={{ color: '#475569' }}>
            Kostenlos · Unverbindlich · Keine Kreditkarte erforderlich
          </p>
        </div>
      </section>

    </div>
  )
}
