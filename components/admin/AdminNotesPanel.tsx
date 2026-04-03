'use client'

/**
 * AdminNotesPanel
 *
 * Reusable internal notes panel for any admin resource.
 * Loads existing notes and lets the admin add new ones.
 *
 * Props:
 *   resourceType  — 'seller' | 'product' | 'order' | 'payout'
 *   resourceId    — the UUID / id of the resource
 *   adminToken    — x-admin-token value for API auth
 */

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Send, Loader2 }      from 'lucide-react'
import { formatDistanceToNow }               from 'date-fns'
import { de }                                from 'date-fns/locale'

// ─── Design tokens (dark admin theme) ─────────────────────────────────────────
const SURF = '#111520'
const ELEV = '#1A1E2E'
const BDR  = '#252A3C'
const T1   = '#F0F2F8'
const T2   = '#8B92A8'
const T3   = '#515A72'
const ACC  = '#6366F1'

export type NoteResourceType = 'seller' | 'product' | 'order' | 'payout'

interface Note {
  id:          string
  created_at:  string
  admin_actor: string | null
  note:        string
}

interface Props {
  resourceType: NoteResourceType
  resourceId:   string
  adminToken:   string
}

export function AdminNotesPanel({ resourceType, resourceId, adminToken }: Props) {
  const [notes,    setNotes]    = useState<Note[]>([])
  const [loading,  setLoading]  = useState(true)
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState('')

  const headers = { 'x-admin-token': adminToken }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(
        `/api/admin/notes?resource_type=${resourceType}&resource_id=${encodeURIComponent(resourceId)}`,
        { headers },
      )
      const data = await res.json()
      if (data.success) setNotes(data.notes ?? [])
    } catch {}
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceType, resourceId, adminToken])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!text.trim()) return
    setSending(true)
    setError('')
    try {
      const res  = await fetch('/api/admin/notes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body:    JSON.stringify({
          resource_type: resourceType,
          resource_id:   resourceId,
          note:          text.trim(),
          admin_actor:   'admin',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setNotes(prev => [data.note, ...prev])
        setText('')
      } else {
        setError(data.error ?? 'Fehler beim Speichern')
      }
    } catch {
      setError('Netzwerkfehler')
    }
    setSending(false)
  }

  return (
    <div style={{ marginTop: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <MessageSquare style={{ width: 14, height: 14, color: T3 }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: T3, textTransform: 'uppercase' }}>
          Interne Notizen
        </span>
        {notes.length > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: ACC,
            background: 'rgba(99,102,241,0.15)', borderRadius: 10,
            padding: '1px 7px',
          }}>
            {notes.length}
          </span>
        )}
      </div>

      {/* Add note input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Notiz hinzufügen…"
          rows={2}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }
          }}
          style={{
            flex: 1, background: ELEV,
            border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : BDR}`,
            borderRadius: 8, padding: '8px 10px',
            color: T1, fontSize: 13, outline: 'none',
            resize: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!text.trim() || sending}
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: text.trim() && !sending ? ACC : ELEV,
            border: `1px solid ${BDR}`, cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, alignSelf: 'flex-start', marginTop: 0,
          }}
        >
          {sending
            ? <Loader2 style={{ width: 14, height: 14, color: T2, animation: 'spin 1s linear infinite' }} />
            : <Send    style={{ width: 14, height: 14, color: text.trim() ? '#fff' : T3 }} />
          }
        </button>
      </div>
      {error && <p style={{ color: '#FCA5A5', fontSize: 12, marginBottom: 10 }}>{error}</p>}

      {/* Notes list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Loader2 style={{ width: 16, height: 16, color: T3, animation: 'spin 1s linear infinite' }} />
        </div>
      ) : notes.length === 0 ? (
        <p style={{ fontSize: 12, color: T3, textAlign: 'center', padding: '12px 0' }}>
          Noch keine Notizen
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.map(n => (
            <div
              key={n.id}
              style={{
                background: ELEV, border: `1px solid ${BDR}`,
                borderRadius: 8, padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T2 }}>
                  {n.admin_actor ?? 'admin'}
                </span>
                <span style={{ fontSize: 11, color: T3 }}>
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: de })}
                </span>
              </div>
              <p style={{ fontSize: 13, color: T1, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {n.note}
              </p>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
