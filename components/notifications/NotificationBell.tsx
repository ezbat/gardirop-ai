'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell }                              from 'lucide-react'
import { NotificationDropdown }             from './NotificationDropdown'
import type { NotificationRow }             from './NotificationItem'

interface Props {
  /** Which API namespace to use */
  apiBase:     '/api/notifications' | '/api/seller/notifications' | '/api/admin/notifications'
  /** "View all" page href */
  viewAllHref: string
  /** Extra fetch init options (e.g. admin token headers) */
  fetchInit?:  RequestInit
  /** Icon / label color override (default white) */
  color?:      string
  /** Whether to show the text label below the bell */
  showLabel?:  boolean
}

export function NotificationBell({
  apiBase, viewAllHref, fetchInit = {}, color = 'rgba(255,255,255,0.65)', showLabel = false,
}: Props) {
  const [open,    setOpen]    = useState(false)
  const [count,   setCount]   = useState(0)
  const [items,   setItems]   = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(false)

  // Poll unread count every 60s
  const fetchCount = useCallback(async () => {
    try {
      const res  = await fetch(`${apiBase}/unread`, fetchInit)
      const data = await res.json()
      if (data.success) setCount(data.unreadCount ?? 0)
    } catch {}
  }, [apiBase, fetchInit])

  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, 60_000)
    // Listen for cross-component notification-read events
    const onRead = () => fetchCount()
    window.addEventListener('notifications-read', onRead)
    return () => { clearInterval(id); window.removeEventListener('notifications-read', onRead) }
  }, [fetchCount])

  // Load full list when dropdown opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`${apiBase}?limit=20`, fetchInit)
      .then(r => r.json())
      .then(d => { if (d.success) setItems(d.notifications ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, apiBase, fetchInit])

  const markAllRead = async () => {
    try {
      const extraHeaders = (fetchInit?.headers && typeof fetchInit.headers === 'object' && !Array.isArray(fetchInit.headers) && !(fetchInit.headers instanceof Headers))
        ? fetchInit.headers as Record<string, string>
        : {}
      await fetch(apiBase, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        body:    '{}',
      })
      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
      setCount(0)
    } catch {}
  }

  const [hovered, setHovered] = useState(false)
  const isLight = color !== 'rgba(255,255,255,0.65)'
  const displayColor = hovered ? (isLight ? '#1A1A1A' : '#FFFFFF') : color

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          color: displayColor, transition: 'color 150ms',
        }}
        aria-label="Benachrichtigungen"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div style={{ position: 'relative' }}>
          <Bell style={{ width: 20, height: 20 }} />
          {count > 0 && (
            <div style={{
              position: 'absolute', top: -5, right: -7,
              minWidth: 15, height: 15, borderRadius: 10,
              background: '#EF4444', color: '#fff',
              fontSize: 8, fontWeight: 700, padding: '0 3px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {count > 99 ? '99+' : count}
            </div>
          )}
        </div>
        {showLabel && <span style={{ fontSize: 10, marginTop: 1 }}>Hinweise</span>}
      </button>

      {open && (
        <NotificationDropdown
          notifications={items}
          loading={loading}
          onClose={() => setOpen(false)}
          onMarkAllRead={markAllRead}
          viewAllHref={viewAllHref}
        />
      )}
    </div>
  )
}
