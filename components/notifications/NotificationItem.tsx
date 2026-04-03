'use client'

import { formatDistanceToNow } from 'date-fns'
import { de }                  from 'date-fns/locale'
import {
  ShoppingBag, MessageCircle, Package, CheckCircle,
  XCircle, Bell, DollarSign, AlertCircle, User,
} from 'lucide-react'

export interface NotificationRow {
  id:             string
  created_at:     string
  type:           string
  title:          string
  body:           string
  link?:          string | null
  is_read:        boolean
  recipient_type: string
  metadata?:      Record<string, unknown>
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  order_placed:           <ShoppingBag  style={{ width: 16, height: 16, color: '#3B82F6' }} />,
  order_shipped:          <Package      style={{ width: 16, height: 16, color: '#8B5CF6' }} />,
  order_delivered:        <CheckCircle  style={{ width: 16, height: 16, color: '#10B981' }} />,
  order_cancelled:        <XCircle      style={{ width: 16, height: 16, color: '#EF4444' }} />,
  new_message:            <MessageCircle style={{ width: 16, height: 16, color: '#0EA5E9' }} />,
  application_approved:   <CheckCircle  style={{ width: 16, height: 16, color: '#10B981' }} />,
  application_rejected:   <XCircle      style={{ width: 16, height: 16, color: '#EF4444' }} />,
  new_order:              <ShoppingBag  style={{ width: 16, height: 16, color: '#3B82F6' }} />,
  product_approved:       <CheckCircle  style={{ width: 16, height: 16, color: '#10B981' }} />,
  product_rejected:       <XCircle      style={{ width: 16, height: 16, color: '#EF4444' }} />,
  payout_paid:            <DollarSign   style={{ width: 16, height: 16, color: '#10B981' }} />,
  payout_failed:          <AlertCircle  style={{ width: 16, height: 16, color: '#EF4444' }} />,
  new_seller_application: <User         style={{ width: 16, height: 16, color: '#F59E0B' }} />,
  payout_requested:       <DollarSign   style={{ width: 16, height: 16, color: '#F59E0B' }} />,
  product_flagged:        <AlertCircle  style={{ width: 16, height: 16, color: '#F59E0B' }} />,
  stuck_order:            <AlertCircle  style={{ width: 16, height: 16, color: '#EF4444' }} />,
}

interface Props {
  notification: NotificationRow
  onClick?:     (n: NotificationRow) => void
}

export function NotificationItem({ notification: n, onClick }: Props) {
  const icon  = TYPE_ICON[n.type] ?? <Bell style={{ width: 16, height: 16, color: '#6B7280' }} />
  const ago   = formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: de })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(n)}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(n) }}
      style={{
        display:      'flex',
        gap:           12,
        padding:      '12px 16px',
        cursor:       n.link ? 'pointer' : 'default',
        background:   n.is_read ? 'transparent' : 'rgba(59,130,246,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition:   'background 150ms',
        outline:      'none',
      }}
      onMouseEnter={(e) => { if (n.link) (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'rgba(255,255,255,0.04)' : 'rgba(59,130,246,0.15)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : 'rgba(59,130,246,0.1)' }}
    >
      {/* Icon bubble */}
      <div style={{
        flexShrink: 0, width: 34, height: 34, borderRadius: 10,
        background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: n.is_read ? 400 : 600,
          color: '#F0F2F8', lineHeight: 1.4, marginBottom: 2,
        }}>
          {n.title}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, marginBottom: 4 }}>
          {n.body}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{ago}</div>
      </div>

      {/* Unread dot */}
      {!n.is_read && (
        <div style={{
          flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
          background: '#3B82F6', marginTop: 4,
        }} />
      )}
    </div>
  )
}
