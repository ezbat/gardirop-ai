'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter }                         from 'next/navigation'
import { Bell, CheckCheck, Loader2 }         from 'lucide-react'
import { NotificationItem, NotificationRow } from '@/components/notifications/NotificationItem'

const PAGE_SIZE = 20

export default function SellerNotificationsPage() {
  const router = useRouter()

  const [items,   setItems]   = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)
  const [filter,  setFilter]  = useState<'all' | 'unread'>('all')

  const load = useCallback(async (p: number, reset = false) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/seller/notifications?page=${p}&limit=${PAGE_SIZE}`)
      const data = await res.json()
      if (data.success) {
        setItems(prev => reset ? data.notifications : [...prev, ...data.notifications])
        setTotal(data.total ?? 0)
        setPage(p)
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load(1, true) }, [load])

  const markAllRead = async () => {
    await fetch('/api/seller/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    window.dispatchEvent(new Event('notifications-read'))
  }

  const handleClick = (n: NotificationRow) => {
    if (!n.is_read) {
      fetch('/api/seller/notifications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: [n.id] }),
      })
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      window.dispatchEvent(new Event('notifications-read'))
    }
    if (n.link) router.push(n.link)
  }

  const displayed = filter === 'unread' ? items.filter(n => !n.is_read) : items
  const unread    = items.filter(n => !n.is_read).length

  return (
    <div style={{ padding: '32px 24px 64px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F9FAFB', margin: 0 }}>
            Benachrichtigungen
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
              border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
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
              borderColor: filter === f ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
              background:  filter === f ? 'rgba(255,255,255,0.12)' : 'transparent',
              color:       filter === f ? '#F9FAFB' : '#9CA3AF',
              cursor: 'pointer',
            }}
          >
            {f === 'all' ? 'Alle' : `Ungelesen${unread > 0 ? ` (${unread})` : ''}`}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <div style={{
        background: '#fff', borderRadius: 14, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {loading && items.length === 0 ? (
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
            <Loader2 style={{ width: 24, height: 24, color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Bell style={{ width: 36, height: 36, color: '#D1D5DB', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: '#9CA3AF' }}>
              {filter === 'unread' ? 'Keine ungelesenen Benachrichtigungen' : 'Noch keine Benachrichtigungen'}
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
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              fontSize: 13, fontWeight: 600, color: '#D1D5DB', cursor: 'pointer',
            }}
          >
            Mehr laden
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
