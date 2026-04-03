'use client'

/**
 * Admin — Seller Applications
 *
 * Design tokens (dark):
 *   page bg   #0B0D14   surface  #111520   elevated  #1A1E2E
 *   border    #252A3C   subtle   #1E2235
 *   text-1    #F0F2F8   text-2   #8B92A8   text-3    #515A72
 *   accent    #6366F1
 */

import { useState, useCallback, useEffect } from 'react'
import {
  Search, RefreshCw, X, Check, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, FileText, Clock, CheckCircle,
  XCircle, Info, Building2, User, Package, Truck,
  ClipboardCheck, Users, ExternalLink,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type AppStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'needs_info'

interface SellerApp {
  id: string
  user_id: string | null
  status: AppStatus
  applicant_type: 'individual' | 'company'

  // Contact
  full_name: string
  email: string
  phone: string | null
  country: string

  // Individual
  legal_full_name: string | null
  date_of_birth: string | null
  residence_country: string | null

  // Company
  company_name: string | null
  company_reg_number: string | null
  vat_id: string | null
  company_address: {
    line1?: string; line2?: string; city?: string
    postal_code?: string; country?: string
  } | null
  business_type: string | null

  // Store
  store_name: string
  brand_name: string | null
  product_categories: string[]
  store_description: string | null
  website_url: string | null
  social_links: { instagram?: string; tiktok?: string; youtube?: string } | null
  estimated_monthly_orders: string | null
  avg_order_value: string | null
  product_origin: string | null
  product_origin_detail: string | null

  // Operations
  return_address: { line1?: string; city?: string; postal_code?: string; country?: string } | null
  support_email: string | null
  shipping_countries: string[]
  fulfillment_model: string | null

  // Declarations
  decl_accurate_info: boolean
  decl_terms_agreed: boolean
  decl_verification_consent: boolean
  decl_product_compliance: boolean
  decl_privacy_acknowledged: boolean
  decl_is_trader: boolean

  // Admin
  reviewer_notes: string | null
  rejection_reason: string | null
  reviewed_at: string | null

  created_at: string
  updated_at: string
}

interface Summary {
  total: number
  submitted: number
  under_review: number
  approved: number
  rejected: number
  needs_info: number
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<AppStatus, {
  label: string; bg: string; color: string; Icon: React.ElementType
}> = {
  submitted:    { label: 'Eingereicht',  bg: 'rgba(100,116,139,0.15)', color: '#94A3B8', Icon: FileText    },
  under_review: { label: 'In Prüfung',  bg: 'rgba(245,158,11,0.15)', color: '#FCD34D', Icon: Clock       },
  approved:     { label: 'Genehmigt',   bg: 'rgba(16,185,129,0.15)', color: '#6EE7B7', Icon: CheckCircle },
  rejected:     { label: 'Abgelehnt',   bg: 'rgba(239,68,68,0.15)',  color: '#FCA5A5', Icon: XCircle     },
  needs_info:   { label: 'Info nötig',  bg: 'rgba(168,85,247,0.15)', color: '#C084FC', Icon: Info        },
}

function StatusBadge({ status }: { status: AppStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.submitted
  const Icon = cfg.Icon
  return (
    <span
      className="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon className="w-[10px] h-[10px]" />
      {cfg.label}
    </span>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function val(v: string | null | undefined) {
  return v?.trim() || '—'
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, Icon, iconBg, iconColor, active, onClick,
}: {
  label: string; value: number; Icon: React.ElementType
  iconBg: string; iconColor: string
  active?: boolean; onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl p-[18px] flex items-start gap-[12px] transition-all duration-150 w-full"
      style={{
        background: active ? '#1A1E2E' : '#111520',
        border: `1px solid ${active ? '#6366F1' : '#252A3C'}`,
        outline: active ? '1px solid rgba(99,102,241,0.3)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        className="w-[36px] h-[36px] rounded-[8px] flex-shrink-0 flex items-center justify-center"
        style={{ background: iconBg }}
      >
        <Icon className="w-[17px] h-[17px]" style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-[11px] font-medium" style={{ color: '#515A72' }}>{label}</p>
        <p className="text-[22px] font-bold leading-tight" style={{ color: '#F0F2F8' }}>{value}</p>
      </div>
    </button>
  )
}

// ─── Reason Modal ─────────────────────────────────────────────────────────────

function ReasonModal({
  title, subtitle, placeholder, confirmLabel, confirmClass, onCancel, onConfirm,
}: {
  title: string; subtitle?: string; placeholder: string
  confirmLabel: string; confirmClass: string
  onCancel: () => void; onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!reason.trim()) return
    setBusy(true)
    await onConfirm(reason.trim())
    setBusy(false)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onCancel}
      />
      <div
        className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[420px] max-w-[calc(100vw-32px)] rounded-[14px] p-[24px]"
        style={{ background: '#111520', border: '1px solid #252A3C', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
      >
        <h3 className="text-[16px] font-bold mb-[4px]" style={{ color: '#F0F2F8' }}>{title}</h3>
        {subtitle && (
          <p className="text-[12px] mb-[16px]" style={{ color: '#515A72' }}>{subtitle}</p>
        )}
        <label className="block text-[12px] font-medium mb-[6px]" style={{ color: '#8B92A8' }}>
          Begründung <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full rounded-[8px] p-[10px] text-[13px] outline-none resize-none focus:ring-2 focus:ring-indigo-500/40"
          style={{ border: '1px solid #252A3C', background: '#1A1E2E', color: '#F0F2F8' }}
        />
        <div className="flex gap-[8px] mt-[14px]">
          <button
            onClick={onCancel}
            className="flex-1 py-[9px] rounded-[8px] text-[13px] font-medium transition-colors hover:bg-[#252A3C]"
            style={{ background: '#1A1E2E', color: '#8B92A8', border: '1px solid #252A3C' }}
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={busy || !reason.trim()}
            className={`flex-1 py-[9px] rounded-[8px] text-[13px] font-semibold text-white transition-colors disabled:opacity-40 ${confirmClass}`}
          >
            {busy
              ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              : confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  title, body, confirmLabel, confirmClass, onCancel, onConfirm,
}: {
  title: string; body: string; confirmLabel: string; confirmClass: string
  onCancel: () => void; onConfirm: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    await onConfirm()
    setBusy(false)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onCancel}
      />
      <div
        className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[380px] max-w-[calc(100vw-32px)] rounded-[14px] p-[24px]"
        style={{ background: '#111520', border: '1px solid #252A3C', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
      >
        <h3 className="text-[16px] font-bold mb-[8px]" style={{ color: '#F0F2F8' }}>{title}</h3>
        <p className="text-[13px] mb-[20px]" style={{ color: '#8B92A8' }}>{body}</p>
        <div className="flex gap-[8px]">
          <button
            onClick={onCancel}
            className="flex-1 py-[9px] rounded-[8px] text-[13px] font-medium transition-colors hover:bg-[#252A3C]"
            style={{ background: '#1A1E2E', color: '#8B92A8', border: '1px solid #252A3C' }}
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className={`flex-1 py-[9px] rounded-[8px] text-[13px] font-semibold text-white transition-colors disabled:opacity-40 ${confirmClass}`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-[12px] py-[9px]" style={{ borderBottom: '1px solid #1E2235' }}>
      <span className="text-[11px] w-[140px] flex-shrink-0 pt-[1px]" style={{ color: '#515A72' }}>
        {label}
      </span>
      <span className="text-[13px] flex-1 break-all leading-relaxed" style={{ color: '#F0F2F8' }}>
        {value?.trim() || '—'}
      </span>
    </div>
  )
}

function DrawerSection({ icon: Icon, iconColor, title, children }: {
  icon: React.ElementType; iconColor: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="mb-[24px]">
      <div className="flex items-center gap-[8px] mb-[2px]">
        <Icon className="w-[14px] h-[14px]" style={{ color: iconColor }} />
        <p className="text-[12px] font-bold uppercase tracking-[0.06em]" style={{ color: iconColor }}>
          {title}
        </p>
      </div>
      <div style={{ borderTop: `1px solid ${iconColor}33` }}>{children}</div>
    </div>
  )
}

function DeclBool({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-[8px] py-[7px]" style={{ borderBottom: '1px solid #1E2235' }}>
      <div
        className="w-[16px] h-[16px] rounded-[3px] flex items-center justify-center flex-shrink-0"
        style={{ background: value ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)', border: `1px solid ${value ? '#6EE7B7' : '#FCA5A5'}` }}
      >
        {value
          ? <Check className="w-[9px] h-[9px]" style={{ color: '#6EE7B7' }} />
          : <X className="w-[9px] h-[9px]" style={{ color: '#FCA5A5' }} />}
      </div>
      <span className="text-[12px]" style={{ color: value ? '#8B92A8' : '#515A72' }}>{label}</span>
    </div>
  )
}

function DetailDrawer({
  app,
  adminToken,
  onClose,
  onActionDone,
}: {
  app: SellerApp
  adminToken: string
  onClose: () => void
  onActionDone: (updated: SellerApp, warning?: string) => void
}) {
  const [modal, setModal] = useState<
    null | { type: 'approve' } | { type: 'reject' } | { type: 'needs_info' } | { type: 'under_review' }
  >(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  async function doAction(action: string, reason?: string) {
    setActionBusy(true)
    setActionError('')
    setModal(null)
    try {
      const res = await fetch('/api/admin/seller-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ applicationId: app.id, action, reason }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Unbekannter Fehler')
      const msg = action === 'approve' ? 'Genehmigt' : action === 'reject' ? 'Abgelehnt'
        : action === 'needs_info' ? 'Info angefordert' : 'Status aktualisiert'
      setActionSuccess(msg + (json.warning ? ` — ⚠ ${json.warning}` : ''))
      onActionDone(json.application, json.warning)
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setActionBusy(false)
    }
  }

  const addr = (a: { line1?: string; line2?: string; city?: string; postal_code?: string; country?: string } | null) =>
    a ? [a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).join(', ') : '—'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-40 flex flex-col"
        style={{
          width: 'min(560px, 100vw)',
          background: '#111520',
          borderLeft: '1px solid #252A3C',
          boxShadow: '-8px 0 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-start justify-between gap-[12px] px-[24px] py-[18px] flex-shrink-0"
          style={{ borderBottom: '1px solid #252A3C' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono mb-[2px]" style={{ color: '#515A72' }}>
              ID: {shortId(app.id)}
            </p>
            <h2 className="text-[16px] font-bold truncate" style={{ color: '#F0F2F8' }}>
              {app.store_name}
            </h2>
            <div className="flex items-center gap-[8px] mt-[4px] flex-wrap">
              <StatusBadge status={app.status} />
              <span className="text-[11px]" style={{ color: '#515A72' }}>
                {app.applicant_type === 'company' ? 'Unternehmen' : 'Privatperson'}
              </span>
              <span className="text-[11px]" style={{ color: '#515A72' }}>· {fmt(app.created_at)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-[32px] h-[32px] rounded-[8px] flex items-center justify-center transition-colors hover:bg-[#1A1E2E]"
            style={{ border: '1px solid #252A3C' }}
          >
            <X className="w-[14px] h-[14px]" style={{ color: '#8B92A8' }} />
          </button>
        </div>

        {/* Action banner */}
        {(actionError || actionSuccess) && (
          <div
            className="mx-[16px] mt-[12px] p-[10px] rounded-[8px] flex items-start gap-[8px] flex-shrink-0"
            style={actionError
              ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }
              : { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            {actionError
              ? <AlertCircle className="w-[14px] h-[14px] flex-shrink-0 mt-[1px]" style={{ color: '#FCA5A5' }} />
              : <Check className="w-[14px] h-[14px] flex-shrink-0 mt-[1px]" style={{ color: '#6EE7B7' }} />}
            <p className="text-[12px] flex-1" style={{ color: actionError ? '#FCA5A5' : '#6EE7B7' }}>
              {actionError || actionSuccess}
            </p>
            <button onClick={() => { setActionError(''); setActionSuccess('') }}>
              <X className="w-[12px] h-[12px]" style={{ color: '#515A72' }} />
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div
          className="flex flex-wrap gap-[6px] px-[16px] py-[12px] flex-shrink-0"
          style={{ borderBottom: '1px solid #252A3C' }}
        >
          <button
            onClick={() => setModal({ type: 'under_review' })}
            disabled={actionBusy || app.status === 'under_review'}
            className="px-[12px] py-[6px] rounded-[7px] text-[12px] font-semibold transition-colors disabled:opacity-30 hover:bg-amber-500/20"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <Clock className="w-[11px] h-[11px] inline mr-[4px]" />
            In Prüfung
          </button>

          <button
            onClick={() => setModal({ type: 'approve' })}
            disabled={actionBusy || app.status === 'approved'}
            className="px-[12px] py-[6px] rounded-[7px] text-[12px] font-semibold transition-colors disabled:opacity-30 hover:bg-emerald-500/20"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <CheckCircle className="w-[11px] h-[11px] inline mr-[4px]" />
            Genehmigen
          </button>

          <button
            onClick={() => setModal({ type: 'needs_info' })}
            disabled={actionBusy || app.status === 'needs_info'}
            className="px-[12px] py-[6px] rounded-[7px] text-[12px] font-semibold transition-colors disabled:opacity-30 hover:bg-purple-500/20"
            style={{ background: 'rgba(168,85,247,0.12)', color: '#C084FC', border: '1px solid rgba(168,85,247,0.25)' }}
          >
            <Info className="w-[11px] h-[11px] inline mr-[4px]" />
            Info anfordern
          </button>

          <button
            onClick={() => setModal({ type: 'reject' })}
            disabled={actionBusy || app.status === 'rejected'}
            className="px-[12px] py-[6px] rounded-[7px] text-[12px] font-semibold transition-colors disabled:opacity-30 hover:bg-red-500/20"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <XCircle className="w-[11px] h-[11px] inline mr-[4px]" />
            Ablehnen
          </button>

          {actionBusy && <Loader2 className="w-[16px] h-[16px] animate-spin self-center ml-auto" style={{ color: '#515A72' }} />}
        </div>

        {/* Scrollable detail body */}
        <div className="flex-1 overflow-y-auto px-[24px] py-[20px]">

          {/* Admin notes (if any) */}
          {(app.reviewer_notes || app.rejection_reason) && (
            <div
              className="mb-[20px] p-[12px] rounded-[8px]"
              style={{
                background: app.status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'rgba(168,85,247,0.08)',
                border: `1px solid ${app.status === 'rejected' ? 'rgba(239,68,68,0.25)' : 'rgba(168,85,247,0.25)'}`,
              }}
            >
              <p className="text-[11px] font-bold mb-[4px]" style={{ color: app.status === 'rejected' ? '#FCA5A5' : '#C084FC' }}>
                {app.status === 'rejected' ? 'Ablehnungsgrund' : 'Admin-Notiz'}
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: '#8B92A8' }}>
                {app.rejection_reason ?? app.reviewer_notes}
              </p>
            </div>
          )}

          {/* 1 — Contact */}
          <DrawerSection icon={User} iconColor="#8B92A8" title="Kontakt">
            <DetailRow label="Vollständiger Name" value={app.full_name} />
            <DetailRow label="E-Mail" value={app.email} />
            <DetailRow label="Telefon" value={app.phone} />
            <DetailRow label="Land" value={app.country} />
            <DetailRow label="Typ" value={app.applicant_type === 'company' ? 'Unternehmen' : 'Privatperson'} />
          </DrawerSection>

          {/* 2 — Identity */}
          <DrawerSection icon={Building2} iconColor="#A5B4FC" title={app.applicant_type === 'company' ? 'Unternehmensdaten' : 'Persönliche Identität'}>
            {app.applicant_type === 'individual' ? (
              <>
                <DetailRow label="Rechtl. Name" value={app.legal_full_name} />
                <DetailRow label="Geburtsdatum" value={app.date_of_birth ? fmt(app.date_of_birth) : null} />
                <DetailRow label="Wohnsitzland" value={app.residence_country} />
              </>
            ) : (
              <>
                <DetailRow label="Unternehmensname" value={app.company_name} />
                <DetailRow label="Rechtsform" value={app.business_type} />
                <DetailRow label="Handelsreg.-Nr." value={app.company_reg_number} />
                <DetailRow label="USt-ID" value={app.vat_id} />
                <DetailRow label="Firmenanschrift" value={addr(app.company_address)} />
              </>
            )}
          </DrawerSection>

          {/* 3 — Store profile */}
          <DrawerSection icon={Package} iconColor="#FCD34D" title="Store-Profil">
            <DetailRow label="Store-Name" value={app.store_name} />
            <DetailRow label="Markenname" value={app.brand_name} />
            <DetailRow label="Kategorien" value={app.product_categories?.join(', ') || null} />
            <DetailRow label="Beschreibung" value={app.store_description} />
            <DetailRow label="Website" value={app.website_url} />
            <DetailRow label="Instagram" value={app.social_links?.instagram} />
            <DetailRow label="TikTok" value={app.social_links?.tiktok} />
            <DetailRow label="YouTube" value={app.social_links?.youtube} />
            <DetailRow label="Bestellvolumen" value={app.estimated_monthly_orders} />
            <DetailRow label="Ø Bestellwert" value={app.avg_order_value} />
            <DetailRow label="Produktherkunft" value={app.product_origin} />
            <DetailRow label="Herkunft-Detail" value={app.product_origin_detail} />
          </DrawerSection>

          {/* 4 — Operations */}
          <DrawerSection icon={Truck} iconColor="#6EE7B7" title="Betrieb & Versand">
            <DetailRow label="Retourenaddr." value={addr(app.return_address)} />
            <DetailRow label="Support-E-Mail" value={app.support_email} />
            <DetailRow label="Versandländer" value={app.shipping_countries?.join(', ') || null} />
            <DetailRow label="Fulfillment"
              value={
                app.fulfillment_model === 'self'       ? 'Selbstversand'
                : app.fulfillment_model === 'warehouse' ? 'Lager / 3PL'
                : app.fulfillment_model === 'dropshipping' ? 'Dropshipping'
                : app.fulfillment_model
              }
            />
          </DrawerSection>

          {/* 5 — Declarations */}
          <DrawerSection icon={ClipboardCheck} iconColor="#C084FC" title="Erklärungen">
            <DeclBool label="Angaben korrekt & vollständig" value={app.decl_accurate_info} />
            <DeclBool label="AGB zugestimmt" value={app.decl_terms_agreed} />
            <DeclBool label="Identitätsprüfung eingewilligt" value={app.decl_verification_consent} />
            <DeclBool label="Produktkonformität bestätigt" value={app.decl_product_compliance} />
            <DeclBool label="Datenschutz zur Kenntnis genommen" value={app.decl_privacy_acknowledged} />
            <DeclBool label="Gewerblicher Händler (DSA)" value={!!app.decl_is_trader} />
          </DrawerSection>

          {/* 6 — Metadata */}
          <DrawerSection icon={FileText} iconColor="#515A72" title="Metadaten">
            <DetailRow label="Antrags-ID" value={app.id} />
            <DetailRow label="User-ID" value={app.user_id} />
            <DetailRow label="Eingereicht am" value={fmt(app.created_at)} />
            <DetailRow label="Zuletzt geändert" value={fmt(app.updated_at)} />
            <DetailRow label="Geprüft am" value={fmt(app.reviewed_at)} />
          </DrawerSection>
        </div>
      </div>

      {/* Action modals */}
      {modal?.type === 'under_review' && (
        <ConfirmModal
          title="Status: In Prüfung"
          body={`Antrag von „${app.store_name}" als „In Prüfung" markieren?`}
          confirmLabel="Bestätigen"
          confirmClass="bg-amber-600 hover:bg-amber-500"
          onCancel={() => setModal(null)}
          onConfirm={() => doAction('under_review')}
        />
      )}
      {modal?.type === 'approve' && (
        <ConfirmModal
          title="Antrag genehmigen"
          body={`„${app.store_name}" genehmigen? ${app.user_id ? 'Ein Seller-Konto wird automatisch erstellt.' : '⚠ Kein User-Konto verknüpft — kein Seller-Konto wird erstellt.'}`}
          confirmLabel="Genehmigen"
          confirmClass="bg-emerald-700 hover:bg-emerald-600"
          onCancel={() => setModal(null)}
          onConfirm={() => doAction('approve')}
        />
      )}
      {modal?.type === 'needs_info' && (
        <ReasonModal
          title="Weitere Informationen anfordern"
          subtitle={`Antrag von „${app.store_name}"`}
          placeholder="z.B. Bitte Handelsregistereintrag nachreichen…"
          confirmLabel="Senden"
          confirmClass="bg-indigo-600 hover:bg-indigo-500"
          onCancel={() => setModal(null)}
          onConfirm={(reason) => doAction('needs_info', reason)}
        />
      )}
      {modal?.type === 'reject' && (
        <ReasonModal
          title="Antrag ablehnen"
          subtitle={`Antrag von „${app.store_name}"`}
          placeholder="z.B. Produktkategorie nicht unterstützt, unzureichende Angaben…"
          confirmLabel="Ablehnen"
          confirmClass="bg-red-700 hover:bg-red-600"
          onCancel={() => setModal(null)}
          onConfirm={(reason) => doAction('reject', reason)}
        />
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminSellerApplicationsPage() {
  const [adminToken, setAdminToken] = useState('')
  const [authed, setAuthed]         = useState(false)
  const [authError, setAuthError]   = useState(false)

  const [applications, setApplications] = useState<SellerApp[]>([])
  const [summary, setSummary]           = useState<Summary>({ total: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0, needs_info: 0 })
  const [loading, setLoading]           = useState(false)
  const [refreshing, setRefreshing]     = useState(false)
  const [pageError, setPageError]       = useState<string | null>(null)

  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState<AppStatus | ''>('')
  const [sort, setSort]                 = useState<'newest' | 'oldest'>('newest')

  const [selectedApp, setSelectedApp]   = useState<SellerApp | null>(null)
  const [globalSuccess, setGlobalSuccess] = useState('')

  // ── Load data ────────────────────────────────────────────────────────────────

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setPageError(null)

    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (search.trim()) params.set('search', search.trim())
    params.set('sort', sort)

    const url = `/api/admin/seller-applications?${params.toString()}`
    const res = await fetch(url, { headers: { 'x-admin-token': adminToken }, cache: 'no-store' })
    const json = await res.json()

    setLoading(false)
    setRefreshing(false)

    if (!res.ok || !json.success) {
      setPageError(json.error ?? 'Fehler beim Laden der Daten')
      return
    }
    setApplications(json.applications ?? [])
    setSummary(json.summary ?? {})
  }, [adminToken, filterStatus, search, sort])

  useEffect(() => { if (authed) load() }, [authed, filterStatus, sort, load])

  // ── Auth ─────────────────────────────────────────────────────────────────────

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!adminToken.trim()) return
    setAuthError(false)
    setLoading(true)
    const res = await fetch('/api/admin/seller-applications', {
      headers: { 'x-admin-token': adminToken },
      cache: 'no-store',
    })
    setLoading(false)
    if (res.status === 401) { setAuthError(true); return }
    const json = await res.json()
    if (!json.success) { setAuthError(true); return }
    setAuthed(true)
    setApplications(json.applications ?? [])
    setSummary(json.summary ?? {})
  }

  // ── App updated callback from drawer ─────────────────────────────────────────

  function handleActionDone(updated: SellerApp, warning?: string) {
    setApplications((prev) => prev.map((a) => a.id === updated.id ? updated : a))
    setSummary((prev) => {
      // Recalculate quickly from updated list
      const next = { ...prev }
      const apps = applications.map((a) => a.id === updated.id ? updated : a)
      const count = (s: AppStatus) => apps.filter((a) => a.status === s).length
      return {
        total: apps.length,
        submitted: count('submitted'),
        under_review: count('under_review'),
        approved: count('approved'),
        rejected: count('rejected'),
        needs_info: count('needs_info'),
      }
    })
    setSelectedApp(updated)
    if (warning) setGlobalSuccess(`⚠ ${warning}`)
    else setGlobalSuccess('Aktion erfolgreich durchgeführt.')
    setTimeout(() => setGlobalSuccess(''), 5000)
  }

  // ── Search on Enter ───────────────────────────────────────────────────────────

  function handleSearchKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') load()
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#0B0D14' }}
      >
        <div
          className="w-full max-w-[360px] rounded-[16px] p-[32px]"
          style={{ background: '#111520', border: '1px solid #252A3C', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        >
          <div className="flex items-center gap-[10px] mb-[8px]">
            <Users className="w-[20px] h-[20px]" style={{ color: '#6366F1' }} />
            <h1 className="text-[18px] font-bold" style={{ color: '#F0F2F8' }}>Seller-Bewerbungen</h1>
          </div>
          <p className="text-[12px] mb-[24px]" style={{ color: '#515A72' }}>
            Admin-Bereich · Authentifizierung erforderlich
          </p>

          <form onSubmit={handleAuth} className="flex flex-col gap-[12px]">
            <div>
              <label className="block text-[12px] font-medium mb-[5px]" style={{ color: '#8B92A8' }}>
                Admin-Token
              </label>
              <input
                type="password"
                autoFocus
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-[8px] px-[12px] py-[10px] text-[13px] outline-none focus:ring-2 focus:ring-indigo-500/40"
                style={{ background: '#1A1E2E', border: `1px solid ${authError ? '#EF4444' : '#252A3C'}`, color: '#F0F2F8' }}
              />
              {authError && (
                <p className="text-[11px] mt-[4px] flex items-center gap-[4px]" style={{ color: '#FCA5A5' }}>
                  <AlertCircle className="w-[11px] h-[11px]" /> Token ungültig
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !adminToken.trim()}
              className="w-full py-[11px] rounded-[8px] text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white transition-colors disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Main UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#0B0D14' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-[14px]"
        style={{ background: '#111520', borderBottom: '1px solid #252A3C' }}
      >
        <div className="flex items-center gap-[10px]">
          <Users className="w-[18px] h-[18px]" style={{ color: '#6366F1' }} />
          <h1 className="text-[16px] font-bold" style={{ color: '#F0F2F8' }}>Seller-Bewerbungen</h1>
          <span
            className="text-[11px] px-[8px] py-[2px] rounded-full font-semibold"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#A5B4FC' }}
          >
            {summary.total} gesamt
          </span>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-[6px] px-[12px] py-[7px] rounded-[8px] text-[12px] font-medium transition-colors hover:bg-[#252A3C] disabled:opacity-40"
          style={{ background: '#1A1E2E', border: '1px solid #252A3C', color: '#8B92A8' }}
        >
          <RefreshCw className={`w-[12px] h-[12px] ${refreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-[28px]">

        {/* Global success banner */}
        {globalSuccess && (
          <div
            className="mb-[16px] p-[12px] rounded-[8px] flex items-center gap-[8px]"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <Check className="w-[14px] h-[14px] flex-shrink-0" style={{ color: '#6EE7B7' }} />
            <p className="text-[13px] flex-1" style={{ color: '#6EE7B7' }}>{globalSuccess}</p>
            <button onClick={() => setGlobalSuccess('')}>
              <X className="w-[12px] h-[12px]" style={{ color: '#515A72' }} />
            </button>
          </div>
        )}

        {/* Error banner */}
        {pageError && (
          <div
            className="mb-[16px] p-[12px] rounded-[8px] flex items-center gap-[8px]"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <AlertCircle className="w-[14px] h-[14px] flex-shrink-0" style={{ color: '#FCA5A5' }} />
            <p className="text-[13px] flex-1" style={{ color: '#FCA5A5' }}>{pageError}</p>
            <button onClick={() => setPageError(null)}>
              <X className="w-[12px] h-[12px]" style={{ color: '#515A72' }} />
            </button>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[10px] mb-[24px]">
          <KpiCard label="Gesamt" value={summary.total}
            Icon={FileText} iconBg="rgba(99,102,241,0.15)" iconColor="#A5B4FC"
            active={filterStatus === ''} onClick={() => setFilterStatus('')}
          />
          <KpiCard label="Eingereicht" value={summary.submitted}
            Icon={ChevronRight} iconBg="rgba(100,116,139,0.15)" iconColor="#94A3B8"
            active={filterStatus === 'submitted'} onClick={() => setFilterStatus('submitted')}
          />
          <KpiCard label="In Prüfung" value={summary.under_review}
            Icon={Clock} iconBg="rgba(245,158,11,0.15)" iconColor="#FCD34D"
            active={filterStatus === 'under_review'} onClick={() => setFilterStatus('under_review')}
          />
          <KpiCard label="Genehmigt" value={summary.approved}
            Icon={CheckCircle} iconBg="rgba(16,185,129,0.15)" iconColor="#6EE7B7"
            active={filterStatus === 'approved'} onClick={() => setFilterStatus('approved')}
          />
          <KpiCard label="Abgelehnt" value={summary.rejected}
            Icon={XCircle} iconBg="rgba(239,68,68,0.15)" iconColor="#FCA5A5"
            active={filterStatus === 'rejected'} onClick={() => setFilterStatus('rejected')}
          />
          <KpiCard label="Info nötig" value={summary.needs_info}
            Icon={Info} iconBg="rgba(168,85,247,0.15)" iconColor="#C084FC"
            active={filterStatus === 'needs_info'} onClick={() => setFilterStatus('needs_info')}
          />
        </div>

        {/* Filter row */}
        <div
          className="flex flex-wrap items-center gap-[8px] p-[14px] rounded-[10px] mb-[16px]"
          style={{ background: '#111520', border: '1px solid #252A3C' }}
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 w-[14px] h-[14px]" style={{ color: '#515A72' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Name, E-Mail, Store, Firma…"
              className="w-full pl-[32px] pr-[12px] py-[8px] rounded-[7px] text-[13px] outline-none focus:ring-1 focus:ring-indigo-500/40"
              style={{ background: '#1A1E2E', border: '1px solid #252A3C', color: '#F0F2F8' }}
            />
          </div>

          {/* Search button */}
          <button
            onClick={() => load()}
            className="px-[12px] py-[8px] rounded-[7px] text-[12px] font-medium transition-colors bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Suchen
          </button>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AppStatus | '')}
            className="px-[10px] py-[8px] rounded-[7px] text-[12px] outline-none appearance-none"
            style={{ background: '#1A1E2E', border: '1px solid #252A3C', color: '#F0F2F8' }}
          >
            <option value="">Alle Status</option>
            <option value="submitted">Eingereicht</option>
            <option value="under_review">In Prüfung</option>
            <option value="approved">Genehmigt</option>
            <option value="rejected">Abgelehnt</option>
            <option value="needs_info">Info nötig</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
            className="px-[10px] py-[8px] rounded-[7px] text-[12px] outline-none appearance-none"
            style={{ background: '#1A1E2E', border: '1px solid #252A3C', color: '#F0F2F8' }}
          >
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
          </select>

          {/* Clear filter */}
          {(filterStatus || search) && (
            <button
              onClick={() => { setFilterStatus(''); setSearch('') }}
              className="flex items-center gap-[4px] px-[8px] py-[8px] rounded-[7px] text-[12px] transition-colors hover:bg-[#252A3C]"
              style={{ color: '#515A72' }}
            >
              <X className="w-[12px] h-[12px]" /> Filter löschen
            </button>
          )}
        </div>

        {/* Table */}
        <div
          className="rounded-[12px] overflow-hidden"
          style={{ background: '#111520', border: '1px solid #252A3C' }}
        >
          {/* Table header */}
          <div
            className="grid text-[11px] font-semibold uppercase tracking-[0.06em] px-[16px] py-[10px]"
            style={{
              gridTemplateColumns: '90px 1fr 100px 180px 100px 120px 90px 80px',
              background: '#1A1E2E',
              color: '#515A72',
              borderBottom: '1px solid #252A3C',
            }}
          >
            <span>ID</span>
            <span>Bewerber / Store</span>
            <span>Typ</span>
            <span>E-Mail</span>
            <span>Land</span>
            <span>Status</span>
            <span>Datum</span>
            <span></span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-[48px] gap-[10px]">
              <Loader2 className="w-[20px] h-[20px] animate-spin" style={{ color: '#515A72' }} />
              <span className="text-[13px]" style={{ color: '#515A72' }}>Laden…</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && applications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-[56px] gap-[10px]">
              <FileText className="w-[28px] h-[28px]" style={{ color: '#252A3C' }} />
              <p className="text-[13px]" style={{ color: '#515A72' }}>
                {search || filterStatus ? 'Keine Bewerbungen gefunden.' : 'Noch keine Bewerbungen vorhanden.'}
              </p>
            </div>
          )}

          {/* Rows */}
          {!loading && applications.map((app, i) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="grid items-center px-[16px] py-[12px] cursor-pointer transition-colors hover:bg-[#141825]"
              style={{
                gridTemplateColumns: '90px 1fr 100px 180px 100px 120px 90px 80px',
                borderBottom: i < applications.length - 1 ? '1px solid #1E2235' : 'none',
                background: selectedApp?.id === app.id ? 'rgba(99,102,241,0.06)' : 'transparent',
              }}
            >
              {/* ID */}
              <span className="font-mono text-[11px]" style={{ color: '#515A72' }}>
                {shortId(app.id)}
              </span>

              {/* Name / Store */}
              <div className="min-w-0 pr-[12px]">
                <p className="text-[13px] font-semibold truncate" style={{ color: '#F0F2F8' }}>
                  {app.store_name}
                </p>
                <p className="text-[11px] truncate" style={{ color: '#515A72' }}>
                  {app.applicant_type === 'company' ? (app.company_name ?? app.full_name) : app.full_name}
                </p>
              </div>

              {/* Type */}
              <span className="text-[11px]" style={{ color: '#8B92A8' }}>
                {app.applicant_type === 'company' ? 'Unternehmen' : 'Privat'}
              </span>

              {/* Email */}
              <span className="text-[12px] truncate pr-[8px]" style={{ color: '#8B92A8' }}>
                {app.email}
              </span>

              {/* Country */}
              <span className="text-[12px]" style={{ color: '#8B92A8' }}>
                {val(app.country)}
              </span>

              {/* Status */}
              <span><StatusBadge status={app.status} /></span>

              {/* Date */}
              <span className="text-[11px]" style={{ color: '#515A72' }}>
                {fmt(app.created_at)}
              </span>

              {/* Open button */}
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedApp(app) }}
                className="flex items-center justify-end gap-[4px] text-[11px] font-medium transition-colors hover:text-indigo-400"
                style={{ color: '#515A72' }}
              >
                Details
                <ChevronRight className="w-[12px] h-[12px]" />
              </button>
            </div>
          ))}
        </div>

        {/* Row count */}
        {!loading && applications.length > 0 && (
          <p className="text-[11px] mt-[10px] text-right" style={{ color: '#515A72' }}>
            {applications.length} Einträge angezeigt
          </p>
        )}
      </div>

      {/* Detail drawer */}
      {selectedApp && (
        <DetailDrawer
          app={selectedApp}
          adminToken={adminToken}
          onClose={() => setSelectedApp(null)}
          onActionDone={handleActionDone}
        />
      )}
    </div>
  )
}
