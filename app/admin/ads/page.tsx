'use client'

import { useState, useEffect } from 'react'
import { getAdminToken } from '@/lib/admin-fetch'
import {
  Megaphone, CheckCircle, XCircle, Clock, Loader2, Search,
  BadgeCheck, Store, Eye,
} from 'lucide-react'

// ── Admin dark theme ───────────────────────────────────────────
const BG       = '#0B0D14'
const SURFACE  = '#111520'
const ELEVATED = '#1A1E2E'
const BORDER   = '#252A3C'
const TEXT1    = '#F1F1F4'
const TEXT2    = '#9BA3B5'
const ACCENT   = '#6366F1'

interface AdApp {
  id: string
  seller_id: string
  package_id: string
  post_id: string | null
  status: string
  admin_notes: string | null
  starts_at: string | null
  ends_at: string | null
  impressions_used: number
  created_at: string
  ad_packages: {
    name: string
    name_de: string
    price_cents: number
    duration_days: number
  }
  sellers: {
    id: string
    shop_name: string
    logo_url: string | null
    is_verified: boolean
  }
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Ausstehend',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  approved:  { label: 'Genehmigt',     color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  rejected:  { label: 'Abgelehnt',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  active:    { label: 'Aktiv',         color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  completed: { label: 'Abgeschlossen', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  cancelled: { label: 'Storniert',     color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

export default function AdminAdsPage() {
  const [applications, setApplications] = useState<AdApp[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/ads?status=${filter}`, {
        headers: { 'x-admin-token': getAdminToken() },
      })
      const data = await res.json()
      if (data.success) setApplications(data.applications || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  const handleAction = async (appId: string, action: 'approve' | 'reject') => {
    setProcessing(appId)
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() },
        body: JSON.stringify({ applicationId: appId, action, notes: noteInput || undefined }),
      })
      if (res.ok) {
        setNoteInput('')
        load()
      }
    } catch (e) { console.error(e) }
    finally { setProcessing(null) }
  }

  const counts = {
    pending:  applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    active:   applications.filter(a => a.status === 'active').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT1, padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Werbeanträge</h1>
          <p style={{ color: TEXT2, fontSize: 14 }}>Prüfe und verwalte Werbeanfragen von Verkäufern.</p>
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Ausstehend', value: counts.pending, color: '#F59E0B' },
            { label: 'Genehmigt', value: counts.approved, color: '#22C55E' },
            { label: 'Aktiv', value: counts.active, color: '#3B82F6' },
          ].map(k => (
            <div key={k.label} style={{
              background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12,
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 8, height: 36, borderRadius: 4, background: k.color,
              }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{k.value}</div>
                <div style={{ fontSize: 11, color: TEXT2, fontWeight: 600 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['pending', 'approved', 'rejected', 'active', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: filter === s ? ACCENT : ELEVATED,
                color: filter === s ? '#fff' : TEXT2,
                border: `1px solid ${filter === s ? ACCENT : BORDER}`,
                cursor: 'pointer',
              }}
            >
              {STATUS_MAP[s]?.label || s}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 style={{ width: 28, height: 28, color: ACCENT, animation: 'spin 1s linear infinite' }} />
          </div>
        ) : applications.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`,
          }}>
            <Megaphone style={{ width: 40, height: 40, color: TEXT2, margin: '0 auto 12px' }} />
            <p style={{ color: TEXT2, fontSize: 14 }}>Keine Anträge in dieser Kategorie.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {applications.map(app => {
              const s = STATUS_MAP[app.status] || STATUS_MAP.pending
              return (
                <div key={app.id} style={{
                  background: SURFACE, borderRadius: 14, border: `1px solid ${BORDER}`,
                  padding: '20px 24px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    {/* Seller info */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, overflow: 'hidden',
                      background: ELEVATED, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {app.sellers?.logo_url ? (
                        <img src={app.sellers.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Store style={{ width: 20, height: 20, color: TEXT2 }} />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{app.sellers?.shop_name || 'Unbekannt'}</span>
                        {app.sellers?.is_verified && (
                          <BadgeCheck style={{ width: 16, height: 16, color: '#3B82F6' }} />
                        )}
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: s.bg, color: s.color,
                        }}>
                          {s.label}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, color: TEXT2, marginBottom: 8 }}>
                        Paket: <strong style={{ color: TEXT1 }}>{app.ad_packages?.name_de || '—'}</strong>
                        {' · '}
                        {((app.ad_packages?.price_cents || 0) / 100).toFixed(2)} €
                        {' · '}
                        {app.ad_packages?.duration_days || 0} Tage
                      </div>

                      <div style={{ fontSize: 12, color: TEXT2 }}>
                        Eingereicht: {new Date(app.created_at).toLocaleDateString('de-DE')}
                        {app.starts_at && ` · Laufzeit: ${new Date(app.starts_at).toLocaleDateString('de-DE')} – ${new Date(app.ends_at!).toLocaleDateString('de-DE')}`}
                      </div>

                      {app.admin_notes && (
                        <p style={{ fontSize: 12, color: '#F59E0B', marginTop: 8, fontStyle: 'italic' }}>
                          Notiz: {app.admin_notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {app.status === 'pending' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                        <input
                          value={noteInput}
                          onChange={e => setNoteInput(e.target.value)}
                          placeholder="Notiz (optional)"
                          style={{
                            padding: '6px 10px', borderRadius: 8, fontSize: 12,
                            background: ELEVATED, border: `1px solid ${BORDER}`, color: TEXT1,
                            width: 180, outline: 'none',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleAction(app.id, 'approve')}
                            disabled={processing === app.id}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                              background: 'rgba(34,197,94,0.15)', color: '#22C55E',
                              border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            }}
                          >
                            <CheckCircle style={{ width: 14, height: 14 }} /> Genehmigen
                          </button>
                          <button
                            onClick={() => handleAction(app.id, 'reject')}
                            disabled={processing === app.id}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                              background: 'rgba(239,68,68,0.15)', color: '#EF4444',
                              border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            }}
                          >
                            <XCircle style={{ width: 14, height: 14 }} /> Ablehnen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
