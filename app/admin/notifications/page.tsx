'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter }                         from 'next/navigation'
import { Bell, CheckCheck, Loader2 }         from 'lucide-react'
import { NotificationItem, NotificationRow } from '@/components/notifications/NotificationItem'

const PAGE_SIZE = 20

// Admin pages read the token from localStorage (same pattern as admin dashboard)
function useAdminToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('adminToken') ?? ''
}

export default function AdminNotificationsPage() {
  const router     = useRouter()
  const adminToken = useAdminToken()

  const headers = { 'x-admin-token': adminToken }

  const [items,   setItems]   = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)
  const [filter,  setFilter]  = useState<'all' | 'unread'>('all')

  const load = useCallback(async (p: number, reset = false) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/notifications?page=${p}&limit=${PAGE_SIZE}`, { headers })
      const data = await res.json()
      if (data.success) {
        setItems(prev => reset ? data.notifications : [...prev, ...data.notifications])
        setTotal(data.total ?? 0)
        setPage(p)
      }
    } catch {}
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken])

  useEffect(() => { load(1, true) }, [load])

  const markAllRead = async () => {
    await fetch('/api/admin/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}',
    })
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const handleClick = (n: NotificationRow) => {
    if (!n.is_read) {
      fetch('/api/admin/notifications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body:    JSON.stringify({ ids: [n.id] }),
      })
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
    }
    if (n.link) router.push(n.link)
  }

  const displayed = filter === 'unread' ? items.filter(n => !n.is_read) : items
  const unread    = items.filter(n => !n.is_read).length

  const BG   = '#0B0D14'
  const SURF = '#111520'
  const BORD = 'rgba(255,255,255,0.06)'

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '32px 24px 64px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F9FAFB', margin: 0 }}>
              Admin-Benachrichtigungen
            </h1>
            {unread > 0 && (
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>
                {unread} ungelesen
              </p>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                border: `1px solid ${BORD}`, background: SURF,
                fontSize: 13, fontWeight: 600, color: '#D1D5DB', cursor: 'pointer',
              }}
            >
              <CheckCheck style={{ width: 14, height: 14 }} />
              Alle gelesen
            </button>
          )}
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: '1px solid',
                borderColor: filter === f ? 'rgba(255,255,255,0.35)' : BORD,
                background:  filter === f ? 'rgba(255,255,255,0.1)' : 'transparent',
                color:       filter === f ? '#F9FAFB' : '#9CA3AF',
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'Alle' : `Ungelesen${unread > 0 ? ` (${unread})` : ''}`}
            </button>
          ))}
        </div>

        {/* ── List ── */}
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: `1px solid ${BORD}` }}>
          {loading && items.length === 0 ? (
            <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
              <Loader2 style={{ width: 24, height: 24, color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Bell style={{ width: 36, height: 36, color: '#D1D5DB', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>
                {filter === 'unread' ? 'Keine ungelesenen Benachrichtigungen' : 'Keine Benachrichtigungen'}
              </p>
            </div>
          ) : (
            displayed.map(n => (
              <NotificationItem key={n.id} notification={n} onClick={handleClick} />
            ))
          )}
        </div>

        {/* ── Load more ── */}
        {items.length < total && !loading && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={() => load(page + 1)}
              style={{
                padding: '10px 24px', borderRadius: 10,
                border: `1px solid ${BORD}`, background: SURF,
                fontSize: 13, fontWeight: 600, color: '#D1D5DB', cursor: 'pointer',
              }}
            >
              Mehr laden
            </button>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
