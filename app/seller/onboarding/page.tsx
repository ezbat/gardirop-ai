'use client'

/**
 * /seller/onboarding — Post-approval seller onboarding hub
 *
 * This page is intentionally standalone (no seller sidebar). It handles
 * ALL onboarding states from "no application" through "fully active seller".
 *
 * State routing:
 *   no_application      → redirect to /sell
 *   submitted           → status page: "Bewerbung eingegangen"
 *   under_review        → status page: "In Prüfung"
 *   needs_info          → status page: "Weitere Infos benötigt"
 *   rejected            → status page: "Nicht genehmigt"
 *   approved_incomplete → onboarding checklist
 *   active_seller       → redirect to /seller/dashboard
 *
 * Design tokens: white cards on #F5F5F5, accent #D97706 (seller orange).
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle, Clock, AlertCircle, XCircle, Info,
  Loader2, Store, Package, Settings, Wallet, ArrowRight,
  ChevronRight, Check, ExternalLink, RefreshCw, Eye, Share2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingState =
  | 'no_application'
  | 'submitted'
  | 'under_review'
  | 'needs_info'
  | 'rejected'
  | 'approved_incomplete'
  | 'active_seller'

interface OnboardingChecklist {
  applicationApproved: boolean
  profileComplete: boolean
  hasProducts: boolean
  payoutReady: boolean | null
}

interface SellerData {
  id: string
  shop_name: string
  shop_slug: string
  shop_description: string | null
}

interface ApplicationData {
  id: string
  status: string
  store_name: string
  full_name: string
  reviewer_notes: string | null
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
}

interface PageData {
  state: OnboardingState
  checklist: OnboardingChecklist | null
  seller: SellerData | null
  application: ApplicationData | null
}

// ─── Step tracker ─────────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  { label: 'Eingereicht',  key: 'submitted' },
  { label: 'In Prüfung',  key: 'under_review' },
  { label: 'Entscheidung', key: 'decision' },
]

function ProcessSteps({ state }: { state: OnboardingState }) {
  const currentStep =
    state === 'submitted'    ? 1
    : state === 'under_review' ? 2
    : (state === 'approved_incomplete' || state === 'active_seller' || state === 'rejected' || state === 'needs_info') ? 3
    : 1

  return (
    <div className="flex items-center gap-0 my-[24px]">
      {PROCESS_STEPS.map((step, i) => {
        const stepNum = i + 1
        const done = stepNum < currentStep
        const active = stepNum === currentStep
        const isLast = i === PROCESS_STEPS.length - 1

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-[6px]">
              <div
                className="w-[32px] h-[32px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: done ? '#D97706' : active ? '#FFFBEB' : '#F5F5F5',
                  border: `2px solid ${done || active ? '#D97706' : '#E5E5E5'}`,
                }}
              >
                {done
                  ? <Check className="w-[14px] h-[14px] text-white" strokeWidth={3} />
                  : <span
                      className="text-[12px] font-bold"
                      style={{ color: active ? '#D97706' : '#AAAAAA' }}
                    >{stepNum}</span>
                }
              </div>
              <span
                className="text-[10px] font-semibold whitespace-nowrap"
                style={{ color: active ? '#D97706' : done ? '#666' : '#AAA' }}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className="flex-1 h-[2px] mb-[18px] mx-[4px]"
                style={{ background: done ? '#D97706' : '#E5E5E5' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Status hero for pending states ──────────────────────────────────────────

function StatusHero({
  icon: Icon, iconBg, iconColor, title, subtitle,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string
  title: string; subtitle: string
}) {
  return (
    <div className="text-center mb-[8px]">
      <div
        className="w-[64px] h-[64px] rounded-2xl mx-auto mb-[16px] flex items-center justify-center"
        style={{ background: iconBg }}
      >
        <Icon className="w-[30px] h-[30px]" style={{ color: iconColor }} />
      </div>
      <h1 className="text-[22px] font-bold mb-[8px]" style={{ color: '#1A1A1A' }}>{title}</h1>
      <p className="text-[14px] leading-relaxed max-w-[400px] mx-auto" style={{ color: '#666' }}>{subtitle}</p>
    </div>
  )
}

// ─── Info card ────────────────────────────────────────────────────────────────

function InfoCard({
  title, items, accentColor = '#D97706', bgColor = '#FFFBEB', borderColor = '#FDE68A',
}: {
  title: string; items: string[]
  accentColor?: string; bgColor?: string; borderColor?: string
}) {
  return (
    <div
      className="rounded-[12px] p-[18px] mb-[16px]"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      <p className="text-[12px] font-bold mb-[10px]" style={{ color: accentColor }}>
        {title}
      </p>
      <ul className="flex flex-col gap-[6px]">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-[8px] text-[13px]" style={{ color: '#555' }}>
            <span className="mt-[2px] flex-shrink-0" style={{ color: accentColor }}>•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Submitted state ──────────────────────────────────────────────────────────

function SubmittedView({ application }: { application: ApplicationData | null }) {
  return (
    <>
      <StatusHero
        icon={CheckCircle}
        iconBg="#FFFBEB"
        iconColor="#D97706"
        title="Bewerbung eingegangen"
        subtitle="Wir haben Ihre Seller-Bewerbung erhalten. Unser Team wird sie in Kürze bearbeiten."
      />
      <ProcessSteps state="submitted" />
      <InfoCard
        title="Was passiert als nächstes?"
        items={[
          'Unser Team überprüft Ihre Angaben und Unterlagen.',
          'Wir können zusätzliche Informationen oder Dokumente anfordern.',
          'Nach Abschluss der Prüfung erhalten Sie eine Benachrichtigung.',
          'Bei Genehmigung erhalten Sie sofort Zugang zum Seller-Dashboard.',
        ]}
      />
      {application && (
        <p className="text-center text-[11px] mt-[4px]" style={{ color: '#AAA' }}>
          Referenz: <span className="font-mono font-semibold" style={{ color: '#D97706' }}>
            {application.id.slice(0, 8).toUpperCase()}
          </span>
          {' · '}Eingereicht: {new Date(application.created_at).toLocaleDateString('de-DE')}
        </p>
      )}
    </>
  )
}

// ─── Under review state ───────────────────────────────────────────────────────

function UnderReviewView() {
  return (
    <>
      <StatusHero
        icon={Clock}
        iconBg="#EFF6FF"
        iconColor="#3B82F6"
        title="Wir prüfen Ihre Unterlagen"
        subtitle="Ihr Antrag wird aktuell von unserem Seller-Relations-Team sorgfältig bearbeitet."
      />
      <ProcessSteps state="under_review" />
      <InfoCard
        title="Aktueller Prüfungsstatus"
        items={[
          'Ihr Antrag ist in der aktiven Überprüfungsphase.',
          'Wir prüfen Identitäts- und Unternehmensangaben.',
          'Sie werden per E-Mail informiert, sobald eine Entscheidung vorliegt.',
          'Bitte haben Sie noch etwas Geduld — wir arbeiten sorgfältig.',
        ]}
        accentColor="#3B82F6"
        bgColor="#EFF6FF"
        borderColor="#BFDBFE"
      />
    </>
  )
}

// ─── Needs info state ─────────────────────────────────────────────────────────

function NeedsInfoView({ application }: { application: ApplicationData | null }) {
  return (
    <>
      <StatusHero
        icon={Info}
        iconBg="#FAF5FF"
        iconColor="#7C3AED"
        title="Weitere Informationen benötigt"
        subtitle="Unser Team benötigt zusätzliche Angaben, bevor Ihre Bewerbung abgeschlossen werden kann."
      />
      <ProcessSteps state="needs_info" />
      {application?.reviewer_notes && (
        <div
          className="rounded-[12px] p-[18px] mb-[16px]"
          style={{ background: '#FAF5FF', border: '1px solid #DDD6FE' }}
        >
          <p className="text-[12px] font-bold mb-[8px]" style={{ color: '#7C3AED' }}>
            Anmerkung des Prüfungsteams
          </p>
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#555' }}>
            {application.reviewer_notes}
          </p>
        </div>
      )}
      <InfoCard
        title="Nächste Schritte"
        items={[
          'Lesen Sie die Anmerkung unseres Teams sorgfältig.',
          'Senden Sie die benötigten Informationen oder Dokumente an unseren Support.',
          'Geben Sie Ihre Bewerbungs-Referenznummer in Ihrer Nachricht an.',
          'Unser Team prüft Ihren Antrag nach Eingang der Unterlagen erneut.',
        ]}
        accentColor="#7C3AED"
        bgColor="#FAF5FF"
        borderColor="#DDD6FE"
      />
      <div className="flex gap-[10px] mt-[4px]">
        <a
          href="mailto:support@wearo.de?subject=Seller-Bewerbung Nachreichung"
          className="flex-1 py-[11px] rounded-[10px] text-[13px] font-semibold text-center text-white transition-opacity hover:opacity-90"
          style={{ background: '#7C3AED' }}
        >
          Support kontaktieren
        </a>
      </div>
    </>
  )
}

// ─── Rejected state ───────────────────────────────────────────────────────────

function RejectedView({ application }: { application: ApplicationData | null }) {
  return (
    <>
      <StatusHero
        icon={XCircle}
        iconBg="#FEF2F2"
        iconColor="#DC2626"
        title="Bewerbung nicht genehmigt"
        subtitle="Nach sorgfältiger Prüfung können wir Ihre Seller-Bewerbung derzeit nicht genehmigen."
      />
      <ProcessSteps state="rejected" />
      {application?.rejection_reason && (
        <div
          className="rounded-[12px] p-[18px] mb-[16px]"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
        >
          <p className="text-[12px] font-bold mb-[8px]" style={{ color: '#DC2626' }}>
            Begründung
          </p>
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#555' }}>
            {application.rejection_reason}
          </p>
        </div>
      )}
      <InfoCard
        title="Hinweise"
        items={[
          'Sie können uns bei Fragen zur Entscheidung kontaktieren.',
          'In einigen Fällen ist eine erneute Bewerbung zu einem späteren Zeitpunkt möglich.',
          'Unser Support-Team steht Ihnen gerne für weitere Informationen zur Verfügung.',
        ]}
        accentColor="#DC2626"
        bgColor="#FEF2F2"
        borderColor="#FECACA"
      />
      <a
        href="mailto:support@wearo.de?subject=Seller-Bewerbung Rückfrage"
        className="block text-center py-[11px] rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: '#DC2626' }}
      >
        Support kontaktieren
      </a>
    </>
  )
}

// ─── Checklist item ───────────────────────────────────────────────────────────

function ChecklistItem({
  icon: Icon, title, description, complete, completionLabel, pendingLabel, href, comingSoon,
}: {
  icon: React.ElementType; title: string; description: string
  complete: boolean; completionLabel: string; pendingLabel: string
  href?: string; comingSoon?: boolean
}) {
  const itemContent = (
    <div
      className="flex items-start gap-[14px] p-[16px] rounded-[12px] transition-all duration-150"
      style={{
        background: 'white',
        border: `1px solid ${complete ? '#D1FAE5' : '#E5E5E5'}`,
      }}
    >
      {/* Completion icon */}
      <div
        className="w-[36px] h-[36px] rounded-full flex-shrink-0 flex items-center justify-center"
        style={{
          background: complete ? 'rgba(16,185,129,0.12)' : comingSoon ? '#F5F5F5' : '#FFFBEB',
          border: `2px solid ${complete ? '#6EE7B7' : comingSoon ? '#E5E5E5' : '#FDE68A'}`,
        }}
      >
        {complete
          ? <Check className="w-[15px] h-[15px]" style={{ color: '#16A34A' }} strokeWidth={2.5} />
          : <Icon className="w-[16px] h-[16px]" style={{ color: comingSoon ? '#BBBBBB' : '#D97706' }} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[8px] mb-[2px]">
          <p className="text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>{title}</p>
          {comingSoon && (
            <span
              className="text-[10px] font-semibold px-[6px] py-[1px] rounded-full"
              style={{ background: '#F5F5F5', color: '#6B6B6B' }}
            >
              Demnächst
            </span>
          )}
        </div>
        <p className="text-[12px]" style={{ color: '#888' }}>{description}</p>
        <p
          className="text-[11px] font-semibold mt-[6px]"
          style={{ color: complete ? '#16A34A' : comingSoon ? '#BBBBBB' : '#D97706' }}
        >
          {complete ? completionLabel : comingSoon ? 'Demnächst verfügbar' : pendingLabel}
        </p>
      </div>

      {/* Arrow (only if has href and not complete) */}
      {href && !complete && !comingSoon && (
        <ChevronRight className="w-[16px] h-[16px] flex-shrink-0 self-center" style={{ color: '#CCC' }} />
      )}
    </div>
  )

  if (href && !complete && !comingSoon) {
    return <Link href={href}>{itemContent}</Link>
  }
  return itemContent
}

// ─── Approved + incomplete state ──────────────────────────────────────────────

function ChecklistView({
  seller,
  checklist,
}: {
  seller: SellerData
  checklist: OnboardingChecklist
}) {
  const [linkCopied, setLinkCopied] = useState(false)

  const storeUrl = seller.shop_slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${seller.shop_slug}`
    : null

  const handleCopyLink = () => {
    if (!storeUrl) return
    navigator.clipboard.writeText(storeUrl).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {})
  }

  const handleShare = () => {
    if (!storeUrl) return
    if (navigator.share) {
      navigator.share({ title: seller.shop_name, url: storeUrl }).catch(() => {})
    } else {
      handleCopyLink()
    }
  }

  const doneCount =
    (checklist.applicationApproved ? 1 : 0) +
    (checklist.profileComplete ? 1 : 0) +
    (checklist.hasProducts ? 1 : 0) +
    (checklist.payoutReady === true ? 1 : 0)

  const totalCount = 4
  const progressPct = Math.round((doneCount / totalCount) * 100)

  // Determine next step CTA
  let nextHref = '/seller/settings'
  let nextLabel = 'Store-Profil vervollständigen'
  if (!checklist.profileComplete) {
    nextHref = '/seller/settings'
    nextLabel = 'Store-Profil vervollständigen'
  } else if (!checklist.hasProducts) {
    nextHref = '/seller/products/create'
    nextLabel = 'Erstes Produkt hinzufügen'
  } else {
    nextHref = '/seller/dashboard'
    nextLabel = 'Zum Dashboard'
  }

  return (
    <>
      {/* Welcome hero */}
      <div
        className="rounded-[16px] p-[24px] mb-[24px] text-center"
        style={{
          background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
          boxShadow: '0 4px 24px rgba(217,119,6,0.25)',
        }}
      >
        <div className="w-[48px] h-[48px] bg-white/20 rounded-2xl mx-auto mb-[12px] flex items-center justify-center">
          <Store className="w-[24px] h-[24px] text-white" />
        </div>
        <h1 className="text-[20px] font-bold text-white mb-[6px]">
          Willkommen, {seller.shop_name}!
        </h1>
        <p className="text-[13px] text-white/80 max-w-[320px] mx-auto">
          Deine Bewerbung wurde genehmigt. Richte jetzt deinen Store ein.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-[20px]">
        <div className="flex items-center justify-between mb-[8px]">
          <p className="text-[12px] font-semibold" style={{ color: '#1A1A1A' }}>
            Einrichtungsfortschritt
          </p>
          <p className="text-[12px] font-bold" style={{ color: '#D97706' }}>
            {doneCount} / {totalCount}
          </p>
        </div>
        <div className="h-[8px] rounded-full overflow-hidden" style={{ background: '#F0F0F0' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #D97706, #F59E0B)',
            }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-[10px] mb-[24px]">
        <ChecklistItem
          icon={CheckCircle}
          title="Bewerbung genehmigt"
          description="Dein Seller-Konto wurde erfolgreich eingerichtet."
          complete={checklist.applicationApproved}
          completionLabel="✓ Abgeschlossen"
          pendingLabel="Ausstehend"
        />
        <ChecklistItem
          icon={Settings}
          title="Store-Profil vervollständigen"
          description="Füge eine Beschreibung, Kontakt und weitere Details hinzu."
          complete={checklist.profileComplete}
          completionLabel="✓ Profil vollständig"
          pendingLabel="Jetzt einrichten →"
          href="/seller/settings"
        />
        <ChecklistItem
          icon={Package}
          title="Erstes Produkt hinzufügen"
          description="Liste dein erstes Produkt und starte mit dem Verkaufen."
          complete={checklist.hasProducts}
          completionLabel="✓ Produkte vorhanden"
          pendingLabel="Produkt hinzufügen →"
          href="/seller/products/create"
        />
        <ChecklistItem
          icon={Wallet}
          title="Auszahlung einrichten"
          description="Verbinde dein Bankkonto für Auszahlungen."
          complete={checklist.payoutReady === true}
          completionLabel="✓ Auszahlung aktiv"
          pendingLabel={checklist.payoutReady === null ? 'Stripe-Konto verbinden →' : 'Verifizierung ausstehend'}
          href={checklist.payoutReady === null ? undefined : '/seller/payouts'}
          comingSoon={checklist.payoutReady === null}
        />
      </div>

      {/* ── Store preview + share ─────────────────────────────── */}
      {storeUrl && checklist.profileComplete && (
        <div
          className="rounded-[12px] p-[18px] mb-[24px]"
          style={{ background: '#F8FAFC', border: '1px solid #E5E5E5' }}
        >
          <p className="text-[12px] font-bold mb-[12px]" style={{ color: '#1A1A1A' }}>
            Dein Store ist live
          </p>
          <p className="text-[12px] mb-[14px] truncate" style={{ color: '#888' }}>
            {storeUrl}
          </p>
          <div className="flex gap-[8px]">
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#D97706' }}
            >
              <Eye className="w-[14px] h-[14px]" />
              Store ansehen
            </a>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-[6px] py-[10px] rounded-[10px] text-[13px] font-semibold transition-colors hover:bg-[#F0F0F0]"
              style={{ background: '#F5F5F5', color: '#555' }}
            >
              <Share2 className="w-[14px] h-[14px]" />
              Teilen
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-[6px] px-[16px] py-[10px] rounded-[10px] text-[13px] font-semibold transition-colors hover:bg-[#F0F0F0]"
              style={{ background: '#F5F5F5', color: linkCopied ? '#16A34A' : '#555' }}
            >
              {linkCopied ? <Check className="w-[14px] h-[14px]" /> : <Share2 className="w-[14px] h-[14px]" />}
              {linkCopied ? 'Kopiert!' : 'Link kopieren'}
            </button>
          </div>
        </div>
      )}

      {/* Primary CTA */}
      <Link
        href={nextHref}
        className="flex items-center justify-center gap-[8px] w-full py-[14px] rounded-[12px] text-[14px] font-bold text-white transition-opacity hover:opacity-90 active:opacity-80 mb-[12px]"
        style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)', boxShadow: '0 4px 16px rgba(217,119,6,0.3)' }}
      >
        {nextLabel}
        <ArrowRight className="w-[16px] h-[16px]" />
      </Link>

      {/* Secondary link to dashboard */}
      {(checklist.profileComplete || checklist.hasProducts) && (
        <Link
          href="/seller/dashboard"
          className="flex items-center justify-center gap-[6px] w-full py-[11px] rounded-[12px] text-[13px] font-semibold transition-colors hover:bg-[#F0F0F0] mb-[4px]"
          style={{ background: '#F5F5F5', color: '#555' }}
        >
          Zum Dashboard
          <ChevronRight className="w-[13px] h-[13px]" />
        </Link>
      )}
    </>
  )
}

// ─── Help footer ──────────────────────────────────────────────────────────────

function HelpFooter() {
  return (
    <div
      className="mt-[24px] pt-[20px] flex flex-wrap items-center justify-center gap-x-[20px] gap-y-[6px]"
      style={{ borderTop: '1px solid #E5E5E5' }}
    >
      <a
        href="mailto:support@wearo.de"
        className="text-[12px] flex items-center gap-[4px] transition-opacity hover:opacity-70"
        style={{ color: '#888' }}
      >
        Support kontaktieren
        <ExternalLink className="w-[10px] h-[10px]" />
      </a>
      <Link
        href="/sell"
        className="text-[12px] transition-opacity hover:opacity-70"
        style={{ color: '#888' }}
      >
        Seller-Infoseite
      </Link>
      <Link
        href="/"
        className="text-[12px] transition-opacity hover:opacity-70"
        style={{ color: '#888' }}
      >
        Zur Startseite
      </Link>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SellerOnboardingPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [pageData, setPageData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [redirecting, setRedirecting] = useState(false)

  // Fetch onboarding status
  useEffect(() => {
    if (sessionStatus === 'loading') return

    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    fetchStatus(session.user.id)
  }, [session, sessionStatus])

  async function fetchStatus(userId: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/seller/onboarding-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Fehler beim Laden')
      setPageData(json)

      // Handle terminal redirects
      if (json.state === 'no_application') {
        setRedirecting(true)
        router.push('/sell')
      } else if (json.state === 'active_seller') {
        setRedirecting(true)
        router.push('/seller/dashboard')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden des Status')
    } finally {
      setLoading(false)
    }
  }

  // ─── Loading screen ─────────────────────────────────────────────────────────

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F5' }}>
        <div className="flex flex-col items-center gap-[12px]">
          <div
            className="w-[48px] h-[48px] rounded-2xl flex items-center justify-center"
            style={{ background: '#D97706' }}
          >
            <Loader2 className="w-[24px] h-[24px] text-white animate-spin" />
          </div>
          <p className="text-[13px]" style={{ color: '#888' }}>Status wird geladen…</p>
        </div>
      </div>
    )
  }

  // ─── Redirecting ────────────────────────────────────────────────────────────

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F5' }}>
        <div className="flex flex-col items-center gap-[12px]">
          <div
            className="w-[48px] h-[48px] rounded-2xl flex items-center justify-center"
            style={{ background: '#D97706' }}
          >
            <ArrowRight className="w-[24px] h-[24px] text-white" />
          </div>
          <p className="text-[13px]" style={{ color: '#888' }}>Weiterleitung…</p>
        </div>
      </div>
    )
  }

  // ─── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F5F5' }}>
        <div
          className="w-full max-w-[440px] rounded-[16px] p-[32px] text-center bg-white"
          style={{ border: '1px solid #E5E5E5' }}
        >
          <AlertCircle className="w-[40px] h-[40px] mx-auto mb-[12px]" style={{ color: '#DC2626' }} />
          <p className="text-[15px] font-semibold mb-[6px]" style={{ color: '#1A1A1A' }}>
            Laden fehlgeschlagen
          </p>
          <p className="text-[13px] mb-[20px]" style={{ color: '#888' }}>{error}</p>
          <button
            onClick={() => session?.user?.id && fetchStatus(session.user.id)}
            className="flex items-center justify-center gap-[6px] mx-auto px-[20px] py-[10px] rounded-[8px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#D97706' }}
          >
            <RefreshCw className="w-[14px] h-[14px]" />
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  if (!pageData) return null

  const { state, checklist, seller, application } = pageData

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen py-[48px] px-4" style={{ background: '#F5F5F5' }}>
      {/* Top nav */}
      <div className="max-w-[480px] mx-auto mb-[24px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-[8px]">
          <div
            className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center"
            style={{ background: '#D97706' }}
          >
            <Store className="w-[15px] h-[15px] text-white" />
          </div>
          <span className="text-[14px] font-bold" style={{ color: '#1A1A1A' }}>Wearo Sellers</span>
        </Link>

        {/* Refresh button */}
        <button
          onClick={() => session?.user?.id && fetchStatus(session.user.id)}
          className="flex items-center gap-[4px] text-[12px] transition-opacity hover:opacity-70"
          style={{ color: '#AAA' }}
        >
          <RefreshCw className="w-[12px] h-[12px]" />
          Aktualisieren
        </button>
      </div>

      {/* Main card */}
      <div
        className="w-full max-w-[480px] mx-auto rounded-[20px] p-[28px] bg-white"
        style={{ border: '1px solid #E5E5E5', boxShadow: '0 4px 32px rgba(0,0,0,0.06)' }}
      >
        {state === 'submitted'    && <SubmittedView application={application} />}
        {state === 'under_review' && <UnderReviewView />}
        {state === 'needs_info'   && <NeedsInfoView application={application} />}
        {state === 'rejected'     && <RejectedView application={application} />}
        {state === 'approved_incomplete' && seller && checklist && (
          <ChecklistView seller={seller} checklist={checklist} />
        )}

        <HelpFooter />
      </div>

      {/* Bottom note */}
      <p className="text-center text-[11px] mt-[20px]" style={{ color: '#CCC' }}>
        Wearo Seller · Alle Angaben vertraulich
      </p>
    </div>
  )
}
