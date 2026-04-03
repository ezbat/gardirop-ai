'use client'

import { useEffect, useRef }          from 'react'
import { useRouter }                   from 'next/navigation'
import { CheckCheck, ArrowRight }      from 'lucide-react'
import { NotificationItem, NotificationRow } from './NotificationItem'

interface Props {
  notifications: NotificationRow[]
  loading:       boolean
  onClose:       () => void
  onMarkAllRead: () => void
  viewAllHref:   string
}

export function NotificationDropdown({
  notifications, loading, onClose, onMarkAllRead, viewAllHref,
}: Props) {
  const router  = useRouter()
  const ref     = useRef<HTMLDivElement>(null)
  const unread  = notifications.filter(n => !n.is_read).length

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleClick = (n: NotificationRow) => {
    onClose()
    if (n.link) router.push(n.link)
  }

  return (
    <div
      ref={ref}
      style={{
        position:     'absolute',
        top:          '100%',
        right:        0,
        marginTop:    8,
        width:        360,
        maxHeight:    480,
        background:   '#1A1A2E',
        borderRadius: 14,
        boxShadow:    '0 8px 32px rgba(0,0,0,0.4)',
        border:       '1px solid rgba(255,255,255,0.1)',
        display:      'flex',
        flexDirection: 'column',
        overflow:     'hidden',
        zIndex:       9999,
      }}
    >
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '14px 16px 10px',
        borderBottom:   '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#F0F2F8' }}>
          Benachrichtigungen
          {unread > 0 && (
            <span style={{
              marginLeft: 8, fontSize: 11, fontWeight: 700,
              background: '#3B82F6', color: '#fff',
              borderRadius: 20, padding: '1px 7px',
            }}>
              {unread}
            </span>
          )}
        </span>
        {unread > 0 && (
          <button
            onClick={onMarkAllRead}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: '#3B82F6', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <CheckCheck style={{ width: 13, height: 13 }} />
            Alle gelesen
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            Laden…
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            Keine Benachrichtigungen
          </div>
        ) : (
          notifications.slice(0, 8).map(n => (
            <NotificationItem key={n.id} notification={n} onClick={handleClick} />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px' }}>
        <button
          onClick={() => { onClose(); router.push(viewAllHref) }}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:             5,
            width:          '100%',
            fontSize:        13,
            fontWeight:      600,
            color:           '#3B82F6',
            background:      'none',
            border:          'none',
            cursor:          'pointer',
            padding:        '6px 0',
          }}
        >
          Alle anzeigen <ArrowRight style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  )
}
