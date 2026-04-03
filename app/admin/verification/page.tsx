"use client"

import { useState, useEffect } from "react"
import { getAdminToken } from "@/lib/admin-fetch"
import { motion } from "framer-motion"
import { BadgeCheck, ShieldOff, Store, Loader2, Search, Users } from "lucide-react"

// Admin color tokens
const BG   = '#0B0D14'
const SURF = '#12151E'
const ELEV = '#1A1E2E'
const BDR  = '#2E3448'
const T1   = '#FFFFFF'
const T2   = '#9EA5BB'
const T3   = '#7B83A0'
const ACC  = '#D97706'

interface Seller {
  id: string
  shop_name: string
  user_id: string
  status: string
  is_verified: boolean
  verified_at: string | null
  follower_count: number
  post_count: number
  created_at: string
}

export default function AdminVerificationPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [search, setSearch] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => { loadSellers() }, [])

  const loadSellers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sellers/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() },
        body: JSON.stringify({ status: null }),
      })
      const data = await res.json()
      setSellers(data.applications || data.sellers || [])
    } catch (err) {
      console.error('Load sellers error:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleVerification = async (seller: Seller) => {
    const action = seller.is_verified ? 'revoke' : 'grant'
    const reason = action === 'revoke'
      ? prompt('Grund für die Entziehung der Verifizierung:')
      : prompt('Grund für die Verifizierung (optional):') || 'Admin verified'

    if (action === 'revoke' && !reason) return

    setProcessingId(seller.id)
    try {
      const res = await fetch('/api/admin/sellers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() },
        body: JSON.stringify({ sellerId: seller.id, action, reason }),
      })
      const data = await res.json()
      if (data.success) {
        setSellers(prev =>
          prev.map(s =>
            s.id === seller.id
              ? { ...s, is_verified: data.is_verified, verified_at: data.is_verified ? new Date().toISOString() : null }
              : s,
          ),
        )
      }
    } catch (err) {
      console.error('Toggle verification error:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = sellers.filter(s => {
    if (filter === 'verified' && !s.is_verified) return false
    if (filter === 'unverified' && s.is_verified) return false
    if (search && !s.shop_name?.toLowerCase().includes(search.toLowerCase())) return false
    return ['active', 'approved'].includes(s.status)
  })

  const verifiedCount = sellers.filter(s => s.is_verified).length

  return (
    <div className="min-h-screen p-6" style={{ background: BG, color: T1 }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <BadgeCheck className="w-6 h-6" style={{ color: ACC }} />
          <div>
            <h1 className="text-xl font-bold">Seller-Verifizierung</h1>
            <p className="text-xs" style={{ color: T3 }}>
              Verifizierte Seller erhalten ein Abzeichen auf Profil, Shop und Beiträgen
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Aktive Seller', value: sellers.filter(s => ['active', 'approved'].includes(s.status)).length, icon: Store },
            { label: 'Verifiziert', value: verifiedCount, icon: BadgeCheck },
            { label: 'Nicht verifiziert', value: sellers.filter(s => ['active', 'approved'].includes(s.status) && !s.is_verified).length, icon: Users },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: SURF, border: `1px solid ${BDR}` }}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="w-4 h-4" style={{ color: ACC }} />
                <span className="text-[11px] uppercase tracking-wider" style={{ color: T3 }}>{s.label}</span>
              </div>
              <span className="text-2xl font-bold">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T3 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Shop suchen..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: ELEV, border: `1px solid ${BDR}`, color: T1 }}
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'verified', 'unverified'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: filter === f ? ACC : ELEV,
                  color: filter === f ? '#FFF' : T2,
                  border: `1px solid ${filter === f ? ACC : BDR}`,
                }}
              >
                {f === 'all' ? 'Alle' : f === 'verified' ? 'Verifiziert' : 'Nicht verifiziert'}
              </button>
            ))}
          </div>
        </div>

        {/* Seller list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACC }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: T3 }}>Keine Seller gefunden</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(seller => (
              <motion.div
                key={seller.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: SURF, border: `1px solid ${BDR}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: seller.is_verified ? `${ACC}20` : `${T3}15`, color: seller.is_verified ? ACC : T3 }}
                  >
                    {seller.shop_name?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{seller.shop_name || 'Unbenannt'}</span>
                      {seller.is_verified && (
                        <BadgeCheck className="w-4 h-4" style={{ color: '#3B82F6' }} />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px]" style={{ color: T3 }}>
                        {seller.follower_count || 0} Follower
                      </span>
                      <span className="text-[11px]" style={{ color: T3 }}>
                        {seller.post_count || 0} Posts
                      </span>
                      {seller.verified_at && (
                        <span className="text-[11px]" style={{ color: T3 }}>
                          Verifiziert: {new Date(seller.verified_at).toLocaleDateString('de-DE')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleVerification(seller)}
                  disabled={processingId === seller.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    transition-all duration-150 disabled:opacity-50"
                  style={{
                    background: seller.is_verified ? '#EF444420' : `${ACC}20`,
                    color: seller.is_verified ? '#EF4444' : ACC,
                    border: `1px solid ${seller.is_verified ? '#EF444430' : `${ACC}30`}`,
                  }}
                >
                  {processingId === seller.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : seller.is_verified ? (
                    <><ShieldOff className="w-3 h-3" /> Entziehen</>
                  ) : (
                    <><BadgeCheck className="w-3 h-3" /> Verifizieren</>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
